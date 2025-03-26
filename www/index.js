import {SynNode} from "rustree";
import {EditorView, basicSetup} from "codemirror"
import {Decoration} from "@codemirror/view"
import {EditorState, StateField, StateEffect} from "@codemirror/state"
import {rust} from "@codemirror/lang-rust"
import {oneDark} from "@codemirror/theme-one-dark"
import file from '!raw-loader!../src/lib.rs'

let cst = document.getElementById('cst');
let view = new EditorView({
  state: EditorState.create({
    doc: file,
    extensions: [
      basicSetup,
      rust(),
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          render()
        }
      }),
      oneDark,
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
    errDiv.appendChild(wrap(`line ${line}, col ${col}: ` + err.to_string(), "pre"));
  });
  return errDiv;
}

function render() {
  let sourceFile = view.state.doc.toString();
  cst.innerHTML = "";
  try {
    let synRoot = SynNode.from_str(sourceFile);
    cst.appendChild(renderCst(synRoot));
  } catch (synError) {
    cst.appendChild(renderErr(synError));
  }
}

render();
