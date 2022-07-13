// ###class
class Person(var pet: String, val name: String, base: Int) {
//    ^
//               ^
//                                ^
    val id : Int
//      ^
    var num : Int
//      ^
    class Test {
//        ^
        fun print() {
//          ^
            println("test")
        }
    }

    inner class Inner {
//              ^
        fun foo() = bar
//          ^
    }
    constructor(pet: String, name: String, id: Int, num: Int) : this(pet), this(name), this(id), this(num)
//  ^

    init {
//  ^
        id = base
        num = base
        println("init")
    }

    fun print() {
//      ^
        val alias = name
        println("name: $alias")
    }
}

// ###data class
data class Thought(val id: Int, val userId: String, var text: String)
//         ^
//                     ^
//                                  ^
//                                                      ^

// ###enum class
enum class MainView {
//         ^
    Loading,
//  ^
    Register,
//  ^
    Login,
//  ^    
    User,
//  ^    
    PostThought,
//  ^    
    Thought,
//  ^
    Home
//  ^
}

// ###interface
open class Rectangle {
//         ^
    open fun draw() { /* ... */ }
//           ^
}
interface Polygon {
//        ^
    fun draw() { /* ... */ } 
//      ^
}
class Square() : Rectangle(), Polygon {
//    ^
    override fun draw() {
//               ^
        super<Rectangle>.draw() 
        super<Polygon>.draw() 
    }
}

// ###object expression 
val helloWorld = object {
//  ^
//               ^
    val hello = "Hello"
//      ^
    val world = "World"
//      ^
    override fun toString() = "$hello $world"
//               ^
}

window.addMouseListener(object : MouseAdapter() {
//                      ^
    override fun mouseClicked(e: MouseEvent) {  }
//               ^

    override fun mouseEntered(e: MouseEvent) {  }
//               ^              
})

class C {
//    ^
    private fun getObject() = object {
//              ^
//                            ^
        val x: String = "x"
//          ^            
    }

    fun printX() {
//      ^
        println(getObject().x)
    }
}

// ###object declaration  
object DataProviderManager {
//     ^
    fun registerDataProvider(provider: DataProvider) {
    }
//      ^
    val allDataProviders: Collection<DataProvider>
//      ^
}


// ###companion object 
class MyClass {
//    ^
    companion object Factory {
//  ^
        fun create(): MyClass = MyClass()
//          ^
    }
}

class MyClass {
//    ^
    companion object { }
//  ^
}

// ###global function & variable 
val person = Person()
//  ^
fun dfs(graph: Graph) {
//  ^
    fun dfs(current: Vertex, visited: MutableSet<Vertex>) {
//      ^
        if (!visited.add(current)) return
        for (v in current.neighbors)
            dfs(v, visited)
    }

    dfs(graph.vertices[0], HashSet())
}
