# ### simple function
def print_pattern():
#   ^
    size = 4
    for i in range(size):
        print("*" * size)
# ### async function
async def c(a: str):
#         ^
  a
# ### Class, ctor, method
class Dog:
#     ^
    def __init__(self, name, age):
#       ^
        self.name = name  # Public attribute
        self._age = age   # Non-Public attribute
    def bark(self):
#       ^
        print(f"woof-woof. I'm {self.name}")
# ### variable
def hello():
#   ^
    b = 123
    b * 11

aaa = 123
#^
aa = b = c = 999
#^
