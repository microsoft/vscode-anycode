// ### for-loop
for (var x = 1; x < 10; x++) {}
//       ^
//              ^
//                      ^
// ### using
var file = 0;
using (var file = new StreamReader("C:\\myfile.txt")) {
//         ^
  Foo(file);
//    ^
}
// ### linq
class ImplicitlyTypedLocals2
{
    static void Main()
    {
        string[] words = { "aPPLE", "BlUeBeRrY", "cHeRry" };
//               ^
        var upperLowerWords =
             from w in words
//                     ^
             select new { ul = w.ToUpper(), w = w.ToLower() };
    }
}
// ### foreach, local vs field
class ImplicitlyTypedLocals2
{
    static void Main()
    {
        foreach (var ul in upperLowerWords)
//                   ^
        {
            Console.WriteLine("Uppercase: {0}, Lowercase: {1}", ul.ul, ul.ul);
//                                                              ^
//                                                                     ^
        }
    }
}
// ### query-expression
var upperLowerWords =
  from w in words
//     ^
  select new { Upper = w.w(), Lower = w.ToLower() };
//                     ^
//                                    ^
// ### method, arguments
class C {
  void Foo(int Foo) {
//             ^
    Bar(Foo)
//      ^
  }
}
// ### ctor, arguments
class Foo {
  Foo(int Foo) {
//        ^
    Bar(Foo)
//      ^
  }
}
// ### ctor, arguments
public class Person
{
   private string last;
   public Person(string lastName, string firstName)
//                      ^
   {
      last = lastName;
//           ^
   }
}
// ### ctor
public class Location
{
   private string locationName;

   public Location(string name) => Name = name;
//                        ^
//                                        ^
   public string Name
   {
      get => locationName;
      set => locationName = value;
   }
}
// ### if-else
void DisplayWeatherReport(double tempInCelsius)
//                               ^
{
    if (tempInCelsius < 20.0)
//      ^
    {
        var tempInCelsius = true
    }
    else
    {
        Console.WriteLine("Perfect!");
    }
}
// ### if-else-shadow
void DisplayWeatherReport(double tempInCelsius)
{
    if (tempInCelsius < 20.0)
    {
        var tempInCelsius = true
//          ^
    }
    else
    {
        Console.WriteLine("Perfect!");
    }
}
// ### switch
void DisplayMeasurement(double measurement)
//                             ^
{
    switch (measurement)
//          ^
    {
        case < 0.0:
            Console.WriteLine($"Measured value is {measurement}; too low.");
//                                                 ^
            break;

        case > 15.0:
            Console.WriteLine($"Measured value is {measurement}; too high.");
//                                                 ^
            break;

        case double.NaN:
            Console.WriteLine("Failed measurement.");
            break;

        default:
            Console.WriteLine($"Measured value is {measurement}.");
//                                                 ^
            break;
    }
}
// ### arguments
public static class TemperatureConverter
{
    public static double FahrenheitToCelsius(string temperatureFahrenheit)
//                                                  ^
    {
        // Convert argument to double for calculations.
        double fahrenheit = Double.Parse(temperatureFahrenheit);
//                                       ^

        // Convert Fahrenheit to Celsius.
        double celsius = (fahrenheit - 32) * 5 / 9;

        return celsius;
    }
}
// ### locals
public static class TemperatureConverter
{
    public static double FahrenheitToCelsius(string temperatureFahrenheit)
    {
        // Convert argument to double for calculations.
        double fahrenheit = Double.Parse(temperatureFahrenheit);
//             ^

        // Convert Fahrenheit to Celsius.
        double celsius = (fahrenheit - 32) * 5 / 9;
//                        ^

        return celsius;
    }
}
// ### pattern match
int? maybe = 12;
//   ^

if (maybe is int number)
//  ^
{
    Console.WriteLine($"The nullable int 'maybe' has the value {number}");
}
// ### pattern match
int? maybe = 12;

if (maybe is int number)
//               ^
{
    Console.WriteLine($"The nullable int 'maybe' has the value {number}");
//                                                              ^
}
// ### parameter array
static class Foo {
    public static string GenerateMessage(params string[] parts)
//                                                       ^
    {
        switch (parts.Length)
//              ^
        {
            case 0:
                return "No elements to the input";
            case 1:
                return $"One element: {parts[0]}";
//                                     ^
            case 2:
                return $"Two elements: {parts[0]}, {parts[1]}";
//                                      ^
//                                                  ^
            default:
                return $"Many elements. Too many to write";
        }
    }
}
// ### generics, class
class E {}
class Foo<E> {
//        ^
    E getItem() {}
//  ^
}
// ### prop vs arg, 1
class A {
    string S;
    void Foo(string S) {
//                  ^
        this.S = S;
//               ^
    }
}
// ### prop vs arg, 2
class A {
    string S;
    void Foo(string S) {
//                  ^
       S = 'aaa' + S;
//     ^
//                 ^
    }
}
// ### prop vs arg, 3
class A {
    string S;
//         ^
    void Foo(string E) {
       S = E;
//     ^
    }
}
// ### /SKIP/ prop vs arg, 4
class A {
    string S;
//         ^
    void Foo(string E) {
       this.S = E;
//          ^
    }
}
