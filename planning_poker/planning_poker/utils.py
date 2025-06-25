import random
import string
from planning_poker.models import Room


def generate_unique_room_code(length=6):
    """
    Generate a unique alphanumeric room code.

    Args:
        length (int): Length of the code to generate. Default is 6.

    Returns:
        str: A unique room code that doesn't exist in the database.
    """
    if length < 3:
        length = 6  # Ensure minimum length

    max_attempts = 100  # Prevent infinite loops
    attempts = 0

    while attempts < max_attempts:
        # Generate a random code of uppercase letters and digits
        # Ensure first character is always a letter to avoid issues
        first_char = random.choice(string.ascii_uppercase)
        remaining_chars = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=length - 1)
        )
        code = first_char + remaining_chars

        # Double-check the code is valid
        if len(code) == length and code and code.strip():
            # Check if the code already exists in the database
            if not Room.objects.filter(code=code).exists():
                return code

        attempts += 1

    # If we can't generate a unique code after max_attempts, raise an exception
    raise ValueError(
        f"Could not generate unique room code after {max_attempts} attempts. "
        f"Database may be full or there's a system issue."
    )
