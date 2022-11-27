import BEMNode from "./node";
import { MyError } from "./utils";

const getClass = (node: MyElement): string | null => {
    const attrs = node.attrs;
    if (!attrs) {
        return null;
    }
    return attrs.find((el) => el.name === 'class')?.value ?? null;
}

const traverseNode = (node: MyElement, classSet: Set<string>, bemParent: BEMNode): MyError | null => {
    const classes = getClass(node);
    if (!classes) {
        return null;
    }
    const bemNode = BEMNode.create(node, classes, classSet, bemParent);
    if (bemNode instanceof MyError) {
        return bemNode;
    }
    if (node.childNodes) {
        for (const el of node.childNodes) {
            if (el.tagName) {
                const res = traverseNode(el, classSet, bemNode);
                if (res instanceof MyError) {
                    return res;
                }
            }
        }
    }
    return null;
};

enum BEMErrorCode {
    NO_PARENT_BLOCK,
    RECURSIVE_ELEMENT,
    ONLY_MODIFIER,
    RECURSIVE_BLOCK,
    MODIFIER_BEFORE_PARENT,
    MIXIN_BEFORE_BLOCK,
}

interface Error1 {
    code: BEMErrorCode.NO_PARENT_BLOCK | BEMErrorCode.ONLY_MODIFIER | BEMErrorCode.MODIFIER_BEFORE_PARENT | BEMErrorCode.MIXIN_BEFORE_BLOCK,
    className: string,
    tagName?: string,
    elLocation?: MyLocation,
}

interface Error2 {
    code: BEMErrorCode.RECURSIVE_ELEMENT | BEMErrorCode.RECURSIVE_BLOCK,
    className: string,
    tagName?: string,
    elLocation?: MyLocation,
    secondElLocation?: MyLocation,
}

type BEMError = Error1 | Error2;

const findLastIndex = <T,>(array: T[], cb: (el: T) => boolean): number => {
    for (let i = array.length - 1; i >= 0; i -= 1) {
        if (cb(array[i])) {
            return i;
        }
    }
    return -1;
};

const checkBEMErrors = (node: BEMNode, errors: BEMError[]) => {
    for (const [index, cl] of node.classes.entries()) {
        const clBlock = cl.block;
        const clElement = cl.element;
        const clModName = cl.modName;
        if (clElement) {
            // NO_PARENT_BLOCK
            if (!node.anyParent((pCls) => pCls.some((pCl) => pCl.className === clBlock))) {
                errors.push({
                    code: BEMErrorCode.NO_PARENT_BLOCK,
                    className: cl.className,
                    tagName: node.el.tagName,
                    elLocation: node.el.sourceCodeLocation,
                });
            }

            // RECURSIVE_ELEMENT
            {
                const beClassName = `${clBlock}__${clElement}`
                const sameParent = node.findParent((pCls) => pCls.some((pCl) => pCl.className === beClassName));
                if (sameParent) {
                    errors.push({
                        code: BEMErrorCode.RECURSIVE_ELEMENT,
                        className: cl.className,
                        tagName: node.el.tagName,
                        elLocation: node.el.sourceCodeLocation,
                        secondElLocation: sameParent.el.sourceCodeLocation,
                    });
                }
            }

            // MIXIN_BEFORE_BLOCK
            {
                const lastBlockIdx = findLastIndex(node.classes, (icl) => !icl.element && !icl.modName);
                if (lastBlockIdx > index) {
                    errors.push({
                        code: BEMErrorCode.MIXIN_BEFORE_BLOCK,
                        className: cl.className,
                        tagName: node.el.tagName,
                        elLocation: node.el.sourceCodeLocation,
                    });
                }
            }
        }

        if (clModName) {
            const parentClass = clElement ? `${clBlock}__${clElement}` : clBlock;
            const parentIndex = node.classes.findIndex((icl) => icl.className === parentClass);

            // ONLY_MODIFIER
            if (parentIndex === -1) {
                errors.push({
                    code: BEMErrorCode.ONLY_MODIFIER,
                    className: cl.className,
                    tagName: node.el.tagName,
                    elLocation: node.el.sourceCodeLocation,
                });
            }

            // MODIFIER_BEFORE_PARENT
            if (parentIndex > index) {
                errors.push({
                    code: BEMErrorCode.MODIFIER_BEFORE_PARENT,
                    className: cl.className,
                    tagName: node.el.tagName,
                    elLocation: node.el.sourceCodeLocation,
                });
            }
        }

        // RECURSIVE_BLOCK
        if (!clElement && !clModName) {
            const sameParent = node.findParent((pCls) => pCls.some((pCl) => pCl.className === clBlock));
            if (sameParent) {
                errors.push({
                    code: BEMErrorCode.RECURSIVE_BLOCK,
                    className: cl.className,
                    tagName: node.el.tagName,
                    elLocation: node.el.sourceCodeLocation,
                    secondElLocation: sameParent.el.sourceCodeLocation,
                });
            }
        }
    }
}


const traverseBEMNode = (node: BEMNode, errors: BEMError[]) => {
    checkBEMErrors(node, errors);
    for (const el of node.children) {
        traverseBEMNode(el, errors);
    }
};

export const locString = (loc?: MyLocation, appendToLoc?: string): string | undefined => {
    if (loc) {
        return `${loc.startLine.toString().padStart(3)}:${loc.startCol.toString().padEnd(3)}${appendToLoc ?? ''}`;
    }
};

const parseErrors = (errors: BEMError[]): string[] | null => {
    if (errors.length === 0) {
        return null;
    }
    return errors.map((err) => {
        let rv = locString(err.elLocation, ' ✖ ') ?? '✖ ';
        rv += 'Ошибка в тэге ' + err.tagName + ': ';
        switch (err.code) {
            case BEMErrorCode.NO_PARENT_BLOCK:
                rv += 'элемент используется без блока в родителях';
                break;
            case BEMErrorCode.RECURSIVE_ELEMENT: {
                const parentLoc = locString(err.secondElLocation) ?? '';
                rv += `элемент вложен в элемент с таким же именем${parentLoc}`;
                break;
            }
            case BEMErrorCode.RECURSIVE_BLOCK: {
                const parentLoc = locString(err.secondElLocation) ?? '';
                rv += `блок вложен в блок с таким же именем${parentLoc}`;
                break;
            }
            case BEMErrorCode.ONLY_MODIFIER:
                rv += 'модификатор используется без блока или элемента';
                break;
            case BEMErrorCode.MODIFIER_BEFORE_PARENT:
                rv += 'модификатор используется перед элементом или блоком';
                break;
            case BEMErrorCode.MIXIN_BEFORE_BLOCK:
                rv += 'миксин используется перед блоком';
                break;
        }
        return rv;
    })
    
};

const getClassNames = (el: BEMNode): string => {
    let cls = el.classes.map((cl) => cl.className).join('.');
    return cls ? '.' + cls : '';
};

const traverseGetClassTree = (top: BEMNode, ident: number): string => {
    const start = "├── ".padStart(4 + ident) + top.el.tagName + getClassNames(top);
    const children = top.children.map((child) => traverseGetClassTree(child, ident + 2));
    return children.length > 0 ? start + '\n' + children.join('\n') : start;
};

export default class BEMClassTree {
    #topNode: BEMNode;
    #allClasses: Set<string>;
    constructor(topNode: BEMNode, allClasses: Set<string>) {
        this.#topNode = topNode;
        this.#allClasses = allClasses;
    }

    static create(body: MyElement): BEMClassTree | MyError {
        const allClasses = new Set<string>();
        const classes = getClass(body);
        const topNode = BEMNode.create(body, classes, allClasses, null);
        if (topNode instanceof MyError) {
            return topNode;
        }
        if (body.childNodes) {
            for (const el of body.childNodes) {
                if (el.tagName) {
                    const res = traverseNode(el, allClasses, topNode);
                    if (res instanceof MyError) {
                        return res;
                    }
                }
            }
        }

        return new BEMClassTree(topNode, allClasses);
    }

    getClassTree(ident: number): string {
        return traverseGetClassTree(this.#topNode, ident);
    }

    checkBEMRules(): string[] | null {
        const errors: BEMError[] = [];
        traverseBEMNode(this.#topNode, errors);
        return parseErrors(errors);
    }
}