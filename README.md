typescript-loop
===============

[![devDependency Status](https://david-dm.org/caitp/typescript-loop/dev-status.svg)](https://david-dm.org/caitp/typescript-loop#info=devDependencies)


Write, compile and evaluate compiled TypeScript, in your browser!

**typescript-loop** is a playground for writing [TypeScript](http://www.typescriptlang.org/), compiling and experiencing the language in the browser. Try it out  [here!](http://caitp.github.io/typescript-loop/#class%20Hacker%20%7B%0A%20%20name%3Astring%3B%0A%0A%20%20constructor(name)%20%7B%0A%20%20%20%20this.name%20%3D%20name%3B%0A%20%20%7D%0A%0A%20%20toString()%20%7B%0A%20%20%20%20return%20%60glorious%20Hacker%2C%20%24%7Bthis.name%7D%60%3B%0A%20%20%7D%0A%7D%0A%0Avar%20me%20%3D%20new%20Hacker(%22%7B%7BYour%20Name%20Here%7D%7D%22)%3B%0Aalert(%60Hello%20%24%7Bme%7D!%60)%3B).

##License

**typescript-loop** is [MIT Licensed](LICENSE.txt). This license applies to all parts of **typescript-loop** that are not external libraries. Externally maintained libraries include:

1. [Bluebird](https://github.com/petkaantonov/bluebird)
1. [Bootstrap](https://github.com/twbs/bootstrap)
1. [CodeMirror](https://github.com/codemirror/codemirror)
1. [jQuery](https://github.com/jquery/jquery)
1. [TypeScript](https://github.com/Microsoft/TypeScript)

These libraries have their own licenses, whose terms may differ from those
below.

The MIT License (MIT)

Copyright (c) 2015 Caitlin Potter & Contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
