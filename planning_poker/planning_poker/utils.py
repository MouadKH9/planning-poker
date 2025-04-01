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
    while True:
        # Generate a random code of uppercase letters and digits
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        
        # Check if the code already exists
        if not Room.objects.filter(code=code).exists():
            return code 