import libcst as cst

src = """
def fooBar(fieldName: str) -> int:
    body = {"keepThis": 1}
    body.get("alsoKeep")
    return fooBar(fieldName=42)
"""


class T(cst.CSTTransformer):
    def leave_Name(self, o, u):  # noqa: N802 - libcst API name
        m = {
            "fooBar": "foo_bar",
            "fieldName": "field_name",
            "keepThis": "DO_NOT_TOUCH",
            "alsoKeep": "DO_NOT_TOUCH",
        }
        return u.with_changes(value=m[o.value]) if o.value in m else u


print(cst.parse_module(src).visit(T()).code)
