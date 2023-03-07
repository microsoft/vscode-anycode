// ### globals
static LANGUAGE: &str = "Sway";
//     ^
const THRESHOLD: i32 = 10;
//    ^
// ### function
fn is_big(n: i32) -> bool {
// ^
    // Access constant in some function
    n > THRESHOLD
}
// ### impl with default function
impl Foo {
//   ^
    const default fn bar() -> i32 {
//                   ^
      default.bar();
    }
}
// ### trait with function
impl Show for i32 {
//   ^
    fn show(&self) -> String {
//     ^
        format!("four-byte signed {}", self)
        format!("four-byte signed {}", self)
    }
}
// ### trait 2
impl Drop for Tree {
//   ^
    fn drop(&mut self) {
//     ^
        unsafe { ffi::ts_tree_delete(self.0.as_ptr()) }
    }
}
// ### trait w/ generics
impl From<GraphNodeRef> for Value {
//   ^                ^
    fn from(value: GraphNodeRef) -> Value {
//     ^
        Value::GraphNode(value)
    }
}
// ### extern
extern "system" {
//     ^      ^
    pub fn fff() -> i32
//         ^
}
