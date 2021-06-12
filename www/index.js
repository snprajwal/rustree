import {SynNode, put_cst} from "cstea";
import {EditorState, EditorView, basicSetup} from "@codemirror/basic-setup"
import {Decoration, DecorationSet} from "@codemirror/view"
import {StateField, StateEffect} from "@codemirror/state"
import {rust} from "@codemirror/lang-rust"

let cst = document.getElementById('cst');
let view = new EditorView({
  state: EditorState.create({
    extensions: [
      basicSetup,
      rust(),
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          doRender()
        }
      })
    ]
  }),
  parent: document.getElementById('source-code')
})

const doHighlight = StateEffect.define()

const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(highlight, tr) {
    for (let e of tr.effects) if (e.is(doHighlight)) {
      return (Decoration.none).update({
        add: [hlMark.range(e.value.from, e.value.to)]
      });
    }
  },
  provide: f => EditorView.decorations.from(f)
})

const hlMark = Decoration.mark({class: "cm-highlight"})

const hlTheme = EditorView.baseTheme({
  ".cm-highlight": { textDecoration: "underline 3px red" }
})

function highlightArea(view, textRange) {
  let effects = [doHighlight.of({from: textRange.start(), to: textRange.end()})];
  if (!view.state.field(highlightField, false)) {
    effects.push(StateEffect.appendConfig.of([highlightField, hlTheme]));
  }
  view.dispatch({effects});
}

function render_cst(synRoot) {
  let nodeDiv = document.createElement("div");
  nodeDiv.className = "syntax-node";
  let r = synRoot.range();
  let synText = wrap(synRoot.text() + synRoot.range().to_string(), "pre");
  synText.onmouseover = () => {
    console.log(r.to_string());
    highlightArea(view, r);
  }
  nodeDiv.appendChild(synText);
  if (!synRoot.is_token()) {
    synRoot.children().forEach(node => {
      nodeDiv.appendChild(render_cst(node));
    });
  }
  return nodeDiv;
}

function wrap(s, tag) {
  let t = document.createElement(tag);
  t.innerText = s;
  return t;
}

function render_err(errorList) {
  let errDiv = document.createElement("div");
  errDiv.className = "syntax-err";
  errorList.forEach(err => {
    errDiv.appendChild(wrap(err.to_string(), "pre"));
    highlightArea(view, err.range());
  });
  return errDiv;
}

function doRender() {
  let sourceFile = view.state.doc.toString();;
  cst.innerHTML = "";
  try {
    let synRoot = SynNode.from_str(sourceFile);
    cst.appendChild(render_cst(synRoot));
  } catch (synError) {
    cst.appendChild(render_err(synError));
  }
}
