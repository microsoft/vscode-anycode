// ### trait
func (me *MySQLError) Is(err error) bool {
//                    ^
    if merr, ok := err.(*MySQLError); ok {
        return merr.Number == me.Number
    }
    return false
}
// ### struct
type MySQLError struct {
//   ^
    Number  uint16
//  ^
    Message string
//  ^
}
// ### spread variable
var (
    ErrInvalidConn       = errors.New("invalid connection")
//  ^
    ErrMalformPkt        = errors.New("malformed packet")
//  ^
    ErrNoTLS             = errors.New("TLS requested but server does not support TLS")
//  ^
)
// ### multiple vars, one line
var c, python, java bool
//  ^
//     ^
//             ^
// ### type alias
type MyFloat float64
//   ^
// ### https://github.com/microsoft/vscode-anycode/issues/4
func TestReverse() {
//   ^
    for _, c := range []struct {
        in, want string
//      ^
//          ^
    }{
        {"",""}
    }{
        
    }
}
