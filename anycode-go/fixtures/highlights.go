// ### paramter
func AbsFunc(v Vertex) float64 {
//           ^
    return math.Sqrt(v.v*v.X + v.Y*v.Y)
//                   ^
//                       ^
//                             ^
//                                 ^
}
// ### variable
func main() {
    v := Vertex{3, 4}
//  ^
    fmt.Println(v.Abs())
//              ^
    fmt.Println(AbsFunc(v))
//                      ^
    p := &Vertex{4, 3}
    fmt.Println(p.Abs())
    fmt.Println(AbsFunc(*p))
}
// ### parameter/switch
func do(i interface{}) {
//      ^
    switch v := i.(type) {
//              ^
    case int:
        fmt.Printf("Twice %v is %v\n", v, v*2)
    case string:
        fmt.Printf("%q is %v bytes long\n", v, len(v))
    default:
        fmt.Printf("I don't know about type %T!\n", v)
    }
}
// ### switch-type
func do(i interface{}) {
    switch v := i.(type) {
//         ^
    case int:
        fmt.Printf("Twice %v is %v\n", v, v*2)
//                                     ^
//                                        ^
    case string:
        fmt.Printf("%q is %v bytes long\n", v, len(v))
//                                          ^
//                                                 ^
    default:
        fmt.Printf("I don't know about type %T!\n", v)
//                                                  ^
    }
}
// ### comments
// Vertex
type Vertex struct {
//   ^
    X, Y float64
}
func (v Vertex) Abs() float64 {
//      ^
    return math.Sqrt(v.X*v.X + v.Y*v.Y)
}
