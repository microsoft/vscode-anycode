// ### class
class YourDerivedGraphicsClass : GraphicsClass
//    ^
{
    public new void DrawRectangle() { }
//                  ^
}

// ### class 2
public class Derived : Base
//           ^
{
    public override void DoWork(int param) { }
//                       ^
    public void DoWork(double param) { }
//              ^
}
// ### static class
public static class TemperatureConverter
//                  ^
{
    public static double CelsiusToFahrenheit(string temperatureCelsius)
//                       ^
    {
        // Convert argument to double for calculations.
        double celsius = Double.Parse(temperatureCelsius);

        // Convert Celsius to Fahrenheit.
        double fahrenheit = (celsius * 9 / 5) + 32;

        return fahrenheit;
    }

    public static double FahrenheitToCelsius(string temperatureFahrenheit)
//                       ^
    {
        // Convert argument to double for calculations.
        double fahrenheit = Double.Parse(temperatureFahrenheit);

        // Convert Fahrenheit to Celsius.
        double celsius = (fahrenheit - 32) * 5 / 9;

        return celsius;
    }
}
// ### static members
public class Automobile
//           ^
{
    public static int NumberOfWheels = 4;
//                    ^

    public static int SizeOfGasTank
//                    ^
    {
        get
        {
            return 15;
        }
    }

    public static void Drive() { }
//                     ^

    public static event EventType RunOutOfGas;
//                                ^
}
// ###  class, field
public class CalendarDateWithInitialization
//           ^
{
    public string Day = "Monday";
//                ^
}
// ### delegate
delegate void Del();
//            ^
