import {SynNode, put_cst} from "cstea";
import {EditorState, EditorView, basicSetup} from "@codemirror/basic-setup"
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

function render_cst(synRoot) {
  cst.innerText += "\n" + synRoot.to_string();
  if (!synRoot.is_token()) {
    synRoot.children().forEach(node => {
      render_cst(node);
      return;
    });
  } else {
    return;
  }
}

function render_err(errorList) {
  cst.innerText = "";
  errorList.forEach(err => {
    cst.innerText += "\n" + err.to_string();
  });
}

function doRender() {
  let sourceFile = view.state.doc.toString();;
  cst.innerText = "";
  try {
    var synRoot = SynNode.from_str(sourceFile);
    render_cst(synRoot);
  } catch (synError) {
    render_err(synError)
  }
}
