"""Tiny shim so plugin modules import cleanly even if Semantic Kernel isn't
installed (e.g. pure mock-mode dev). When SK is present we use the real
`kernel_function` decorator; otherwise a no-op that preserves the function."""

try:  # pragma: no cover
    from semantic_kernel.functions import kernel_function  # type: ignore
except Exception:  # pragma: no cover

    def kernel_function(*_args, **_kwargs):  # type: ignore
        def deco(fn):
            return fn

        return deco
