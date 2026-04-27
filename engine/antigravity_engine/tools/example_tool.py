import requests
import ast
import operator as _operator


def web_search(query: str) -> str:
    """Performs a web search for the given query.

    This is a mock function to demonstrate the expected structure of a tool.
    In a real implementation, this would call a search API like Google Custom Search
    or Serper.dev.

    Args:
        query: The search query string.

    Returns:
        A string containing the search results (mocked for this example).
    """
    # <thought>
    # In a real scenario, I would:
    # 1. Validate the query (ensure it's not empty).
    # 2. Construct the API request with proper headers and API key.
    # 3. Handle potential network errors or rate limits.
    # 4. Parse the JSON response to extract relevant snippets.
    # For now, I will return a placeholder string.
    # </thought>
    
    print(f"DEBUG: Performing web search for '{query}'")
    
    # Mock response
    results = f"Search results for: {query}\n1. Result A for {query}...\n2. Result B for {query}..."
    return results

def get_stock_price(ticker: str) -> float:
    """Retrieves the current stock price for a given ticker.
    
    Args:
        ticker: The stock ticker symbol (e.g., 'GOOGL').
        
    Returns:
        The current price as a float.
    """
    # <thought>
    # This tool would typically connect to a financial data provider.
    # I need to ensure the ticker is uppercase.
    # </thought>
    
    print(f"DEBUG: Getting stock price for '{ticker}'")
    return 150.00 # Mock price


def calculate_math(expression: str) -> float:
    """Safely evaluate a mathematical expression and return the numeric result.

    This function parses the expression using Python's AST and permits only a
    restricted set of nodes and operators (binary ops, unary ops, numeric
    literals). It does not execute arbitrary code and therefore is safe for
    untrusted input compared to `eval`.

    Args:
        expression: A string containing the math expression (e.g. "2 + 3*4").

    Returns:
        The numeric result as a float.

    Raises:
        ValueError: If the expression contains unsupported nodes or is invalid.
    """

    # Allowed operator mapping
    operators = {
        ast.Add: _operator.add,
        ast.Sub: _operator.sub,
        ast.Mult: _operator.mul,
        ast.Div: _operator.truediv,
        ast.Pow: _operator.pow,
        ast.Mod: _operator.mod,
        ast.FloorDiv: _operator.floordiv,
        ast.UAdd: _operator.pos,
        ast.USub: _operator.neg,
    }

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant):  # Python 3.8+
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("Unsupported constant type")
        if isinstance(node, ast.Num):  # older AST
            return node.n
        if isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            if op_type in operators:
                return operators[op_type](left, right)
            raise ValueError(f"Unsupported binary operator: {op_type}")
        if isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type in operators:
                return operators[op_type](operand)
            raise ValueError(f"Unsupported unary operator: {op_type}")
        raise ValueError(f"Unsupported expression: {type(node)}")

    try:
        parsed = ast.parse(expression, mode="eval")
        result = _eval(parsed)
        if isinstance(result, (int, float)):
            return float(result)
        raise ValueError(f"Invalid expression result type: {type(result)}")
    except Exception as exc:
        raise ValueError(f"Invalid expression: {exc}")


def get_weather(city: str) -> dict:
    """Return mock weather data for a given city.

    This is a placeholder that demonstrates a typical tool shape. In a real
    implementation this would call a weather API and return structured data.

    Args:
        city: The city name to get weather for.

    Returns:
        A dictionary with mock `temperature_c`, `condition`, and `city`.
    """

    print(f"DEBUG: Fetching weather for '{city}' (mock)")
    # Mocked weather response
    return {
        "city": city,
        "temperature_c": 21.5,
        "condition": "Partly Cloudy",
    }


def send_email(to: str, body: str) -> str:
    """Mock sending an email to demonstrate a stateful side-effect tool.

    This function does not actually send email; it simulates the action and
    returns a confirmation string. Replace with a real SMTP or email API call
    in production.

    Args:
        to: The recipient email address.
        body: The email body content.

    Returns:
        A short confirmation message.
    """

    print(f"DEBUG: Sending email to {to}. Body length: {len(body)}")
    return f"Email sent to {to} (mock)."
