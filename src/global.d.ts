declare global {
    interface MyLocation {
        /** One-based line index of the first character. */
        startLine: number;
        /** One-based column index of the first character. */
        startCol: number;
        /** Zero-based first character index. */
        startOffset: number;
        /** One-based line index of the last character. */
        endLine: number;
        /** One-based column index of the last character. Points directly *after* the last character. */
        endCol: number;
        /** Zero-based last character index. Points directly *after* the last character. */
        endOffset: number;
    }
  
    interface MyElement {
        tagName?: string;
        attrs?: MyAttribute[];
        sourceCodeLocation?: MyLocation;
        parentNode: ParentNode | null;
        childNodes?: MyElement[];
    }

    interface MyAttribute {
        name: string;
        value: string;
    }
}

export {};