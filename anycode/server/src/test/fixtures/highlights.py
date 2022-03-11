# ### variable
fooo = 123
#^
bar = 2*fooo
#       ^
# ### function args
def _sum(arr, brr):
#        ^
    a = b = arr;
#           ^
    return(arr)
#          ^
