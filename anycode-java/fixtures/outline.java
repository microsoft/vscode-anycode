// ### module dotted-name
module com.foo { }
//     ^     ^
// ### class, inline props, ctor
class Point {
//    ^
  int x, y;
//    ^
//       ^
  Point(int x, int y) {
//^
    this.x = x;
    this.y = y;
  }

  Point() {
//^
    this(0, 0);
  }
}
// ### class, static method
public class Foo {
//           ^
  public static void main(String args[]) {}
//                   ^
}
// ### interface, method
interface I {
//        ^
  String foo();
//       ^
}
