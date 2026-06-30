"""One-shot provisioner for the live Salesforce data source.

Reproduces the org setup the agent reads from:
  1. authenticate with OAuth client credentials (reads server/.env),
  2. deploy the Salentica-shaped custom objects + a permission set (Metadata API),
  3. assign the permission set to the integration (run-as) user,
  4. load the Smith Family Office data with the lookup hierarchy wired.

Idempotent: re-running redeploys the (unchanged) objects and reloads the data.

Run from the server/ directory:
    .venv/Scripts/python scripts/provision_salesforce.py

Requires in server/.env:  SF_CONSUMER_KEY, SF_CONSUMER_SECRET, SF_INSTANCE_URL
"""

from __future__ import annotations

import base64
import html
import io
import json
import os
import re
import time
import zipfile

import httpx
from dotenv import load_dotenv

HERE = os.path.dirname(__file__)
load_dotenv(dotenv_path=os.path.join(HERE, "..", ".env"))
DATA_FILE = os.path.join(HERE, "..", "app", "data", "familyOffice.json")
API = "59.0"

KEY = os.environ["SF_CONSUMER_KEY"]
SECRET = os.environ["SF_CONSUMER_SECRET"]
BASE = os.environ["SF_INSTANCE_URL"]

# (api_name, type, label, opts)
OBJECTS = {
    "Relationship__c": ("Relationship", "Relationships", [
        ("Relationship_Type__c", "Text", "Relationship Type", {"length": 120}),
        ("Total_AUM__c", "Number", "Total AUM", {"precision": 18, "scale": 2}),
        ("Primary_Advisor__c", "Text", "Primary Advisor", {"length": 120}),
        ("Reporting_Currency__c", "Text", "Reporting Currency", {"length": 10}),
        ("Risk_Profile__c", "Text", "Risk Profile", {"length": 60}),
        ("External_Id__c", "Text", "External Id", {"length": 40, "externalId": True, "unique": True}),
    ]),
    "Portfolio__c": ("Portfolio", "Portfolios", [
        ("Relationship__c", "Lookup", "Relationship", {"referenceTo": "Relationship__c", "relationshipName": "Portfolios", "relationshipLabel": "Portfolios"}),
        ("Entity_Type__c", "Text", "Entity Type", {"length": 80}),
        ("AUM__c", "Number", "AUM", {"precision": 18, "scale": 2}),
        ("Jurisdiction__c", "Text", "Jurisdiction", {"length": 80}),
        ("External_Id__c", "Text", "External Id", {"length": 40, "externalId": True, "unique": True}),
    ]),
    "FinancialAccount__c": ("Financial Account", "Financial Accounts", [
        ("Portfolio__c", "Lookup", "Portfolio", {"referenceTo": "Portfolio__c", "relationshipName": "FinancialAccounts", "relationshipLabel": "Financial Accounts"}),
        ("Account_Type__c", "Text", "Account Type", {"length": 80}),
        ("Custodian__c", "Text", "Custodian", {"length": 120}),
        ("Market_Value__c", "Number", "Market Value", {"precision": 18, "scale": 2}),
        ("Account_Number__c", "Text", "Account Number", {"length": 40}),
        ("Liquidity__c", "Text", "Liquidity", {"length": 60}),
        ("As_Of_Date__c", "Date", "As Of Date", {}),
        ("External_Id__c", "Text", "External Id", {"length": 40, "externalId": True, "unique": True}),
    ]),
}
_FORDER = ["externalId", "fullName", "label", "length", "precision", "referenceTo",
           "relationshipLabel", "relationshipName", "scale", "type", "unique"]


def auth() -> tuple[str, str]:
    j = httpx.post(BASE + "/services/oauth2/token",
                   data={"grant_type": "client_credentials", "client_id": KEY, "client_secret": SECRET}, timeout=30).json()
    return j["access_token"], j["instance_url"]


# ── metadata XML (elements grouped + alphabetical, per the Metadata API XSD) ──
def _field_xml(api, ftype, label, o):
    el = {"fullName": api, "label": label, "type": ftype}
    if ftype == "Text":
        el["length"] = o.get("length", 80)
    if ftype == "Number":
        el["precision"] = o.get("precision", 18); el["scale"] = o.get("scale", 2)
    if ftype == "Lookup":
        el["referenceTo"] = o["referenceTo"]; el["relationshipLabel"] = o["relationshipLabel"]; el["relationshipName"] = o["relationshipName"]
    if o.get("externalId"):
        el["externalId"] = "true"
    if o.get("unique"):
        el["unique"] = "true"
    return "<fields>" + "".join(f"<{k}>{el[k]}</{k}>" for k in _FORDER if k in el) + "</fields>"


def _object_xml(label, plural, fields):
    body = "".join(_field_xml(*f) for f in fields)
    return ('<?xml version="1.0" encoding="UTF-8"?><CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">'
            f'<deploymentStatus>Deployed</deploymentStatus>{body}<label>{label}</label>'
            f'<nameField><label>{label} Name</label><type>Text</type></nameField>'
            f'<pluralLabel>{plural}</pluralLabel><sharingModel>ReadWrite</sharingModel></CustomObject>')


def _permset_xml():
    fps, ops = [], []
    for obj, (_, _, fields) in OBJECTS.items():
        ops.append(f"<objectPermissions><allowCreate>true</allowCreate><allowDelete>true</allowDelete>"
                   f"<allowEdit>true</allowEdit><allowRead>true</allowRead><modifyAllRecords>true</modifyAllRecords>"
                   f"<object>{obj}</object><viewAllRecords>true</viewAllRecords></objectPermissions>")
        for (api, *_r) in fields:
            fps.append(f"<fieldPermissions><editable>true</editable><field>{obj}.{api}</field><readable>true</readable></fieldPermissions>")
    return ('<?xml version="1.0" encoding="UTF-8"?><PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">'
            + "".join(fps) + "<hasActivationRequired>false</hasActivationRequired><label>Certuity Agent Access</label>"
            + "".join(ops) + "</PermissionSet>")


def _package_xml():
    members = "".join(f"<members>{o}</members>" for o in OBJECTS)
    return ('<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'
            f'<types>{members}<name>CustomObject</name></types>'
            '<types><members>Certuity_Agent_Access</members><name>PermissionSet</name></types>'
            f'<version>{API}</version></Package>')


def _zip_b64():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("package.xml", _package_xml())
        for name, (label, plural, fields) in OBJECTS.items():
            z.writestr(f"objects/{name}.object", _object_xml(label, plural, fields))
        z.writestr("permissionsets/Certuity_Agent_Access.permissionset", _permset_xml())
    return base64.b64encode(buf.getvalue()).decode()


def deploy(access, inst):
    meta = inst + "/services/Soap/m/" + API

    def soap(action, body):
        env = ('<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
               'xmlns:met="http://soap.sforce.com/2006/04/metadata"><soapenv:Header><met:SessionHeader>'
               f'<met:sessionId>{access}</met:sessionId></met:SessionHeader></soapenv:Header><soapenv:Body>{body}</soapenv:Body></soapenv:Envelope>')
        return httpx.post(meta, content=env.encode("utf-8"),
                          headers={"Content-Type": "text/xml; charset=UTF-8", "SOAPAction": action}, timeout=60)

    r = soap("deploy", f"<met:deploy><met:ZipFile>{_zip_b64()}</met:ZipFile><met:DeployOptions>"
                       "<met:singlePackage>true</met:singlePackage><met:rollbackOnError>true</met:rollbackOnError></met:DeployOptions></met:deploy>")
    job = re.search(r"<id>(.*?)</id>", r.text).group(1)
    print("deploy id:", job)
    for _ in range(48):
        time.sleep(5)
        rs = soap("checkDeployStatus", f"<met:checkDeployStatus><met:asyncProcessId>{job}</met:asyncProcessId><met:includeDetails>true</met:includeDetails></met:checkDeployStatus>")
        if re.search(r"<done>true</done>", rs.text):
            st = re.search(r"<status>(.*?)</status>", rs.text).group(1)
            if st in ("Succeeded", "SucceededPartial"):
                print("deploy: SUCCEEDED"); return
            raise SystemExit("deploy FAILED: " + str([html.unescape(e) for e in re.findall(r"<problem>(.*?)</problem>", rs.text)]))
    raise SystemExit("deploy timed out")


def rest(access, inst):
    h = {"Authorization": "Bearer " + access, "Content-Type": "application/json"}

    def query(q):
        return httpx.get(inst + f"/services/data/v{API}/query", headers=h, params={"q": q}, timeout=30).json().get("records", [])

    def insert(obj, body):
        d = httpx.post(inst + f"/services/data/v{API}/sobjects/{obj}", headers=h, content=json.dumps(body), timeout=30).json()
        if not d.get("success"):
            raise SystemExit(f"insert {obj} failed: {d}")
        return d["id"]

    def delete(obj, rid):
        httpx.delete(inst + f"/services/data/v{API}/sobjects/{obj}/{rid}", headers=h, timeout=30)

    return query, insert, delete


def assign_permset(access, inst):
    query, insert, _ = rest(access, inst)
    uid = httpx.get(inst + "/services/oauth2/userinfo", headers={"Authorization": "Bearer " + access}).json()["user_id"]
    psid = query("SELECT Id FROM PermissionSet WHERE Name='Certuity_Agent_Access'")[0]["Id"]
    if not query(f"SELECT Id FROM PermissionSetAssignment WHERE PermissionSetId='{psid}' AND AssigneeId='{uid}'"):
        insert("PermissionSetAssignment", {"AssigneeId": uid, "PermissionSetId": psid})
    print("permission set assigned")


def load_data(access, inst):
    query, insert, delete = rest(access, inst)
    for obj in ["FinancialAccount__c", "Portfolio__c", "Relationship__c"]:
        for rec in query(f"SELECT Id FROM {obj}"):
            delete(obj, rec["Id"])

    data = json.load(open(DATA_FILE, encoding="utf-8"))
    rel = data["SalenticaLMNTS__Relationship__c"]["records"][0]
    rel_id = insert("Relationship__c", {
        "Name": rel["Name"], "Relationship_Type__c": rel["SalenticaLMNTS__Relationship_Type__c"],
        "Total_AUM__c": rel["SalenticaLMNTS__Total_AUM__c"], "Primary_Advisor__c": rel["SalenticaLMNTS__Primary_Advisor__c"],
        "Reporting_Currency__c": rel.get("SalenticaLMNTS__Reporting_Currency__c"),
        "Risk_Profile__c": rel.get("SalenticaLMNTS__Risk_Profile__c"), "External_Id__c": rel["Id"]})

    portmap = {}
    for p in data["SalenticaLMNTS__Portfolio__c"]["records"]:
        portmap[p["Id"]] = insert("Portfolio__c", {
            "Name": p["Name"], "Relationship__c": rel_id, "Entity_Type__c": p["SalenticaLMNTS__Entity_Type__c"],
            "AUM__c": p["SalenticaLMNTS__AUM__c"], "Jurisdiction__c": p["SalenticaLMNTS__Jurisdiction__c"], "External_Id__c": p["Id"]})

    accts = data["SalenticaLMNTS__FinancialAccount__c"]["records"]
    for a in accts:
        insert("FinancialAccount__c", {
            "Name": a["Name"], "Portfolio__c": portmap[a["SalenticaLMNTS__Portfolio__c"]],
            "Account_Type__c": a["SalenticaLMNTS__Account_Type__c"], "Custodian__c": a["SalenticaLMNTS__Custodian__c"],
            "Market_Value__c": a["SalenticaLMNTS__Market_Value__c"], "Account_Number__c": a["SalenticaLMNTS__Account_Number__c"],
            "Liquidity__c": a["SalenticaLMNTS__Liquidity__c"], "As_Of_Date__c": a["SalenticaLMNTS__As_Of_Date__c"], "External_Id__c": a["Id"]})
    print(f"loaded: 1 relationship, {len(portmap)} portfolios, {len(accts)} accounts")


def main():
    access, inst = auth()
    print("authenticated:", inst)
    deploy(access, inst)
    assign_permset(access, inst)
    access, inst = auth()  # refresh so the new permission set takes effect
    load_data(access, inst)
    print("done.")


if __name__ == "__main__":
    main()
