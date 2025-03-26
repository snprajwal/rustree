import {SynNode} from "rustree";
import {EditorView, basicSetup} from "codemirror"
import {Decoration} from "@codemirror/view"
import {EditorState, StateField, StateEffect} from "@codemirror/state"
import {rust} from "@codemirror/lang-rust"
import {gruvboxDark} from "@uiw/codemirror-theme-gruvbox-dark";

let defaultText = `use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Read, Write};

#[derive(Debug)]
struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Self {
        Person { name, age }
    }

    fn introduce(&self) -> String {
        format!("Hi, I'm {} and I'm {} years old", self.name, self.age)
    }
}

fn process_people(people: &mut HashMap<String, Person>) -> io::Result<()> {
    let mut file = File::create("people.txt")?;

    for (_, person) in people.iter_mut() {
        if person.age < 30 {
            person.age += 1;
        }
        writeln!(file, "{}", person.introduce())?;
    }

    Ok(())
}

fn main() -> io::Result<()> {
    let mut people = HashMap::new();
    people.insert("alice".to_string(), Person::new("Alice".to_string(), 28));
    people.insert("bob".to_string(), Person::new("Bob".to_string(), 35));

    process_people(&mut people)?;
    println!("Processed everyone!");

    Ok(())
}`;

let cst = document.getElementById('cst');
let view = new EditorView({
  state: EditorState.create({
    doc: defaultText,
    extensions: [
      basicSetup,
      rust(),
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          render()
        }
      }),
      gruvboxDark,
    ]
  }),
  parent: document.getElementById('source-code'),
})

const doHighlight = StateEffect.define()

const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(_, tr) {
    for (let e of tr.effects) if (e.is(doHighlight)) {
      return (Decoration.none).update({
        add: [hlMark.range(e.value.from, e.value.to)]
      });
    }
    return Decoration.none;
  },
  provide: f => EditorView.decorations.from(f)
})

const hlMark = Decoration.mark({class: "cm-highlight"})

const hlTheme = EditorView.baseTheme({
  ".cm-highlight": {
    backgroundColor: "#ff3299aa"
  }
})

function highlightArea(view, textRange) {
  let effects = [doHighlight.of({from: textRange.start(), to: textRange.end()})];
  if (!view.state.field(highlightField, false)) {
    effects.push(StateEffect.appendConfig.of([highlightField, hlTheme]));
  }
  view.dispatch({effects});
}

function renderCst(synRoot) {
  let nodeDiv = document.createElement("div");
  nodeDiv.className = "syntax-node";
  let synText = synTextHtml(synRoot);
  // FIXME: support highlight on hover
  // let r = synRoot.range();
  // synText.onmouseover = () => {
  //   highlightArea(view, r);
  //   view.scrollIntoView(r.start());
  // }
  nodeDiv.appendChild(synText);
  if (!synRoot.is_token()) {
    synRoot.children().forEach(node => {
      nodeDiv.appendChild(renderCst(node));
    });
  }
  return nodeDiv;
}

function synTextHtml(node) {
  let kind = document.createElement("span");
  kind.innerText = ` ${node.kind()} `
  kind.className = "kind";

  let text = document.createElement("span");
  text.innerText = ` ${node.text()} `
  text.className = "token-text";

  let range = document.createElement("span");
  range.innerText = ` ${node.range().to_string()} `
  range.className = "range";

  let d = document.createElement("div");
  d.className = "syntax-props";
  d.appendChild(kind);
  d.appendChild(text);
  d.appendChild(range);

  return d;
}

function wrap(s, tag) {
  let t = document.createElement(tag);
  t.innerText = s;
  return t;
}

function renderErr(errorList) {
  let errDiv = document.createElement("div");
  errDiv.className = "syntax-err";
  errorList.forEach(err => {
    let sourceFile = view.state.doc.toString();
    let line = err.range().line(sourceFile);
    let col = err.range().col(sourceFile);
    errDiv.appendChild(wrap(`${line}:${col}: ` + err.to_string(), "pre"));
  });
  return errDiv;
}

function render() {
  let sourceFile = view.state.doc.toString();
  cst.innerHTML = "";
  try {
    let synRoot = SynNode.from_str(sourceFile);
    let root = renderCst(synRoot);
    root.className = "root-syntax-node";
    cst.appendChild(root);
  } catch (synError) {
    cst.appendChild(renderErr(synError));
  }
}

render();
