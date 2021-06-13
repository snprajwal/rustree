mod utils;

use js_sys::Array;
use syntax::{
    ast::{self, AstNode},
    NodeOrToken, SourceFile, SyntaxElement, SyntaxError, SyntaxNode,
};
use wasm_bindgen::prelude::*;

use std::{convert::From, str::FromStr};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// wrapper type to pass syntax elements to JS
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SynNode {
    node: SyntaxElement,
}

impl SynNode {
    pub fn new(node: SyntaxElement) -> Self {
        Self { node }
    }
}

#[wasm_bindgen]
impl SynNode {
    pub fn children(&self) -> Vec<JsValue> {
        match &self.node {
            NodeOrToken::Node(n) => n
                .children_with_tokens()
                .map(SynNode::new)
                .map(JsValue::from)
                .collect(),
            NodeOrToken::Token(_) => vec![],
        }
    }

    pub fn is_token(&self) -> bool {
        self.node.as_token().is_some()
    }

    pub fn to_string(&self) -> String {
        format!("{:?} {:?}", self.node.kind(), self.node.text_range(),)
    }

    pub fn range(&self) -> TextRange {
        let r = self.node.text_range();
        (r.start().into(), r.end().into()).into()
    }

    pub fn kind(&self) -> String {
        format!("{:?}", self.node.kind())
    }

    pub fn text(&self) -> String {
        match &self.node {
            NodeOrToken::Node(_) => "".into(),
            NodeOrToken::Token(t) => format!("{:?}", t.text()),
        }
    }

    pub fn from_str(s: &str) -> Result<JsValue, JsValue> {
        FromStr::from_str(s)
            .map(|p: SynNode| JsValue::from(p))
            .map_err(JsValue::from)
    }
}

impl FromStr for SynNode {
    type Err = Array;
    fn from_str(s: &str) -> Result<Self, Array> {
        let source_file = SourceFile::parse(s);
        if source_file.errors().is_empty() {
            Ok(Self {
                node: NodeOrToken::Node(source_file.ok().unwrap().syntax().clone()),
            })
        } else {
            Err(source_file
                .errors()
                .into_iter()
                .map(SynErr::new)
                .map(JsValue::from)
                .collect())
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
struct SynErr {
    err: SyntaxError,
}

impl SynErr {
    pub fn new(err: &SyntaxError) -> Self {
        Self { err: err.clone() }
    }
}

#[wasm_bindgen]
impl SynErr {
    pub fn range(&self) -> TextRange {
        let r = self.err.range();
        (r.start().into(), r.end().into()).into()
    }
    pub fn to_string(&self) -> String {
        self.err.to_string()
    }
}

#[wasm_bindgen]
pub struct TextRange {
    start: u32,
    end: u32,
}

impl From<(u32, u32)> for TextRange {
    fn from((start, end): (u32, u32)) -> Self {
        TextRange { start, end }
    }
}

impl TextRange {
    pub fn to_line_col(&self, source: &str) -> (u32, u32) {
        let end = self.end() as usize;
        let line = &source[..end].chars().filter(|&c| c == '\n').count() + 1;
        let col = &source[..end].rfind('\n').map(|c| end - c).unwrap_or(end);
        (line as u32, *col as u32)
    }
}

#[wasm_bindgen]
impl TextRange {
    pub fn start(&self) -> u32 {
        self.start
    }

    pub fn end(&self) -> u32 {
        self.end
    }

    pub fn line(&self, source: &str) -> u32 {
        self.to_line_col(source).0
    }

    pub fn col(&self, source: &str) -> u32 {
        self.to_line_col(source).1
    }

    pub fn to_string(&self) -> String {
        format!("{}..{}", self.start, self.end)
    }
}
