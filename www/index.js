import {SynNode} from "rustree";
import {EditorView, minimalSetup} from "codemirror"
import {EditorState, StateEffect, StateField} from "@codemirror/state"
import {rust} from "@codemirror/lang-rust"
import {gruvboxDark} from "@uiw/codemirror-theme-gruvbox-dark";
import {lineNumbers, highlightActiveLineGutter, highlightActiveLine, keymap, Decoration} from '@codemirror/view';
import {indentOnInput, bracketMatching} from '@codemirror/language';
import {historyKeymap} from '@codemirror/commands';
import {closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete';

const defaultText = `use std::collections::HashMap;
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

const view = new EditorView({
  state: EditorState.create({
    doc: defaultText,
    extensions: [
      minimalSetup,
      lineNumbers(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      keymap.of([
        ...closeBracketsKeymap,
        ...historyKeymap,
      ]),
      rust(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          render();
        }
      }),
      gruvboxDark,
    ]
  }),
  parent: document.getElementById('source-code'),
})


const hlMark = Decoration.mark({class: "cm-highlight"})
const hlTheme = EditorView.baseTheme({
  ".cm-highlight": {
    // Use the gruvbox yellow with 30% opacity
    backgroundColor: "#fabd2f4d"
  }
})

const doHighlight = StateEffect.define();
const clearHighlight = StateEffect.define();
const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    for (let e of tr.effects) {
      if (e.is(doHighlight)) {
        return Decoration.set([hlMark.range(e.value.from, e.value.to)]);
      }
      if (e.is(clearHighlight)) {
        return Decoration.none;
      }
    }
    return deco.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
})

function highlight(view, range) {
  let effects = [doHighlight.of({from: range.start(), to: range.end()})];
  if (!view.state.field(highlightField, false)) {
    effects.push(StateEffect.appendConfig.of([highlightField, hlTheme]));
  }
  view.dispatch({effects, scrollIntoView: true});
}

function renderCst(node) {
  const nodeDiv = document.createElement("div");
  nodeDiv.className = "syntax-node";
  const text = nodeText(node);
  const range = node.range();
  // Highlight the source snippet when hovering over a syntax node
  text.addEventListener("mouseover", () => {
    highlight(view, node.range());
  });
  // Select the source snippet if clicked
  text.addEventListener("click", () => {
    view.dispatch({
      selection: {anchor: range.start(), head: range.end()},
      scrollIntoView: true
    });
  });
  nodeDiv.appendChild(text);
  if (!node.is_token()) {
    node.children().forEach(node => {
      nodeDiv.appendChild(renderCst(node));
    });
  }
  return nodeDiv;
}

function nodeText(node) {
  const kind = document.createElement("span");
  kind.innerText = ` ${node.kind()} `
  kind.className = "kind";

  const text = document.createElement("span");
  text.innerText = ` ${node.text()} `
  text.className = "token-text";

  const range = document.createElement("span");
  range.innerText = ` ${node.range().to_string()} `
  range.className = "range";

  const div = document.createElement("div");
  div.className = "syntax-content";
  div.appendChild(kind);
  div.appendChild(text);
  div.appendChild(range);

  return div;
}

function wrap(s, tag) {
  const t = document.createElement(tag);
  t.innerText = s;
  return t;
}

function renderErrors(errorList) {
  const errDiv = document.createElement("div");
  errDiv.className = "syntax-err";
  const sourceFile = view.state.doc.toString();
  errorList.forEach(err => {
    const line = err.range().line(sourceFile);
    const col = err.range().col(sourceFile);
    errDiv.appendChild(wrap(`${line}:${col}: ` + err.to_string(), "pre"));
  });
  return errDiv;
}

function render() {
  const sourceFile = view.state.doc.toString();
  const cst = document.getElementById('cst');
  // Clear highlighting when the mouse leaves the CST frame
  cst.addEventListener("mouseout", () => {
    view.dispatch({effects: [clearHighlight.of(null)]});
  });
  cst.innerHTML = "";
  try {
    const root = renderCst(SynNode.from_str(sourceFile));
    root.id = "root-syntax-node";
    cst.appendChild(root);
  } catch (errors) {
    cst.appendChild(renderErrors(errors));
  }
}

render();
