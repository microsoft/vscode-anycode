<!-- ### ctor arg -->
<?php
class Point {
    protected int $x;
    protected int $y;

    public function __construct(int $x, int $y = 0) {
//                                          ^
        $this->x = $x;
        $this->y = $y;
//                 ^
    }
}
?>
<!-- ### variable -->
<?php
  $foo = 25;
//^  ^ 
far($foo)
//  ^  ^
?>
<!-- ### function argument -->
<?php
function takes_array($input)
//                   ^
{
    echo "$input[0] + $input[1] = ", $input[0]+$input[1];
//                                   ^
//                                             ^
}
?>
