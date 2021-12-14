// ### function, argument -> same name
function foo(foo: number) {
//           ^
    console.log(foo)
//              ^
}
// ### function, argument -> same name, 2
function foo(foo:number) {
//       ^
    console.log(foo)
}
foo(1);
//^
// ### generic type argument
let E = 1;
function bar<E>(foo: E):E {
//           ^
//                   ^
//                      ^

}
