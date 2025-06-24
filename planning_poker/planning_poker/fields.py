from django.db import models


class STATUS_CHOICES(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"


class POINT_SYSTEMS:
    FIBONACCI = "fibonacci"
    MODIFIED_FIBONACCI = "modified_fibonacci"
    POWERS_OF_2 = "powers_of_2"
    T_SHIRT = "t_shirt"

    choices = [
        (FIBONACCI, "Fibonacci (1, 2, 3, 5, 8, 13, 21)"),
        (
            MODIFIED_FIBONACCI,
            "Modified Fibonacci (0, 1/2, 1, 2, 3, 5, 8, 13, 20, 40, 100)",
        ),
        (POWERS_OF_2, "Powers of 2 (1, 2, 4, 8, 16, 32, 64)"),
        (T_SHIRT, "T-Shirt Sizes (XS, S, M, L, XL, XXL)"),
    ]


# Point system card values mapping
POINT_SYSTEM_CARDS = {
    POINT_SYSTEMS.FIBONACCI: ["1", "2", "3", "5", "8", "13", "21", "?", "☕"],
    POINT_SYSTEMS.MODIFIED_FIBONACCI: [
        "0",
        "0.5",
        "1",
        "2",
        "3",
        "5",
        "8",
        "13",
        "20",
        "40",
        "100",
        "?",
        "☕",
    ],
    POINT_SYSTEMS.POWERS_OF_2: ["1", "2", "4", "8", "16", "32", "64", "?", "☕"],
    POINT_SYSTEMS.T_SHIRT: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
}
