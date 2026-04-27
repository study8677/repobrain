"""Demo script to exercise the example tools and the agent.

Run with:
    python3 scripts/demo_tools.py

This script calls the tools directly, then via the agent's registry. It forces
using local/dummy clients for the agent's network calls to avoid external API
activity.
"""

from src.tools.example_tool import (
    calculate_math,
    get_weather,
    send_email,
    web_search,
    get_stock_price,
)
from src.agent import GeminiAgent


def demo_direct_calls():
    print("--- Direct tool calls ---")
    print("calculate_math('2 + 3*4') ->", calculate_math("2 + 3*4"))
    print("get_weather('Bogota, Colombia') ->", get_weather("Bogota, Colombia"))
    print("send_email('alice@example.com', 'Hola desde la demo') ->", send_email("alice@example.com", "Hola desde la demo"))
    print("web_search('python testing') ->", web_search("python testing"))
    print("get_stock_price('GOOGL') ->", get_stock_price("GOOGL"))


def demo_via_agent_registry():
    print("\n--- Agent registry calls ---")
    agent = GeminiAgent()

    # To keep the demo deterministic and avoid external API calls, we call
    # the registered tool functions directly through the agent's mapping.
    print("agent.available_tools keys:", list(agent.available_tools.keys()))

    # Call calculate_math via the agent
    res_math = agent.available_tools["calculate_math"]("(10 - 3) ** 2")
    print("agent.calculate_math('(10 - 3) ** 2') ->", res_math)

    # Call get_weather via the agent
    res_weather = agent.available_tools["get_weather"]("Medellin, Colombia")
    print("agent.get_weather('Medellin, Colombia') ->", res_weather)

    # Call send_email via the agent
    res_email = agent.available_tools["send_email"]("bob@example.com", "Prueba desde agente")
    print("agent.send_email(...) ->", res_email)


if __name__ == "__main__":
    demo_direct_calls()
    demo_via_agent_registry()
