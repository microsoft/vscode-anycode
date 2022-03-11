// ### variable
fn main() {
    let x = 5;
//      ^
    println!("The value of x is: {}", x);
//                                    ^
    x = 6;
//  ^
    println!("The value of x is: {}", x);
//                                    ^
}
// ### shadow variable
fn main() {
    let x = 5;
//      ^
    let x = x + 1;
//      ^
//          ^
    let x = x * 2;
//      ^
//          ^
    println!("The value of x is: {}", x);
//                                    ^
}
// ### mutable variable
let mut spaces = "   ";
//      ^
spaces = spaces.len();
//^
//       ^
// ### variable vs field
let mut spaces = "   ";
//      ^
spaces = spaces.spaces;
//^
//       ^
// ### const-def/usage
const MAX_POINTS: u32 = 100_000;
//    ^
fn foo() {
	foo(MAX_POINTS)
//      ^
}
// ### function-def/usage
fn main() {
    println!("Hello, world!");
    another_function();
//  ^
}
fn another_function() {
// ^
    println!("Another function.");
}
// ### mod defines scope
mod foo {
    fn foobar(_x: i32) -> () {}
//     ^
}
fn main() {
	foobar(23)
}
// ### args
fn another_function(x: i32) {
//                  ^
    println!("The value of x is: {}", x);
//                                    ^
}
// ### let expression 1
fn main() {
    let x = 5;
//      ^
    let y = {
        let x = 3;
        x + 1
    };
    println!("The value of y is: {}", y);
}
// ### let expression 2
fn main() {
    let x = 5;
    let y = {
//      ^
        let x = 3;
        x + 1
    };
    println!("The value of y is: {}", y);
//                                    ^
}
// ### let expression 3
fn main() {
    let x = 5;
    let y = {
        let x = 3;
//          ^
        x + 1
//      ^
    };
    println!("The value of y is: {}", y);
}
// ### if-else-else
fn main() {
    let number = 6;
//      ^
    if number % 4 == 0 {
//     ^
        println!("number is divisible by 4");
    } else if number % 3 == 0 {
//            ^
        println!("number is divisible by 3");
    } else if number % 2 == 0 {
//            ^
        println!("number is divisible by 2");
    } else {
        println!("number is not divisible by 4, 3, or 2");
    }
}
// ### loop-expression
fn main() {
    let mut counter = 0;
//          ^
    let result = loop {
        counter += 1;
//      ^
        if counter == 10 {
//         ^
            break counter * 2;
//                ^
        }
    };
    println!("The result is {}", result);
}
// ### for
fn main() {
    let a = [10, 20, 30, 40];
    for element in a.iter() {
//      ^
        println!("the value is: {}", element);
//                                   ^
    }
}
// ### /SKIP/ for-shadow
fn main() {
    let a = [10, 20, 30, 40];
    for a in a.iter() {
//      ^
        println!("the value is: {}", a);
//                                   ^
    }
}
// ### struct assign
fn build_user(email: String, username: String) -> User {
//            ^
    User {
        email: email,
//             ^
        username: username,
    }
}
// ### struct assign shorthand
fn build_user(email: String, username: String) -> User {
//            ^
    User {
        email,
//      ^
        username,
    }
}
// ### if-let
let some_u8_value = Some(0u8);
//  ^
if let Some(3) = some_u8_value {
//               ^
    println!("three");
}
// ### match
let some_u8_value = Some(0u8);
//  ^
match some_u8_value {
//    ^
    Some(3) => println!("three"),
    _ => (),
}
// ### tuple-pattern
fn main() {
    let (x, y, z) = tup;
//          ^
    println!("The value of y is: {}", y);
//                                    ^
}
// ### self-parameter
impl Encode {
    pub fn as_str(&self) -> &str {
//                 ^
        str::from_utf8(&self.buf).unwrap()
//                      ^
    }
}
