In FastAPI, there are two related `Depends` definitions:

- `fastapi/params.py` defines the callable class: `class Depends:`
  - Its initializer is:
    - `Depends.__init__(self, dependency: Optional[Callable[..., Any]] = None, *, use_cache: bool = True)`
  - So `__init__` accepts:
    - `dependency`: optional callable, default `None`
    - `use_cache`: keyword-only `bool`, default `True`

- `fastapi/param_functions.py` defines the helper function:
  - `def Depends(...)`
  - Its parameters are:
    - `dependency: Annotated[Optional[Callable[..., Any]], Doc(...)] = None`
    - `use_cache: Annotated[bool, Doc(...)] = True`

So, the `Depends` callable class is defined in `fastapi/params.py`, and its `__init__` accepts an optional callable dependency plus `use_cache=True`. The public wrapper function also exists in `fastapi/param_functions.py` with the same effective arguments.
