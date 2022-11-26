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
    ELEMENT_OF_ELEMENT,
}

interface Error1 {
    code: BEMErrorCode.NO_PARENT_BLOCK | BEMErrorCode.ONLY_MODIFIER | BEMErrorCode.ELEMENT_OF_ELEMENT,
    className: string,
    elLocation?: MyLocation,
}

interface Error2 {
    code: BEMErrorCode.RECURSIVE_ELEMENT | BEMErrorCode.RECURSIVE_BLOCK,
    className: string,
    elLocation?: MyLocation,
    secondElLocation?: MyLocation,
}

type BEMError = Error1 | Error2;

const checkBEMErrors = (node: BEMNode, errors: BEMError[]) => {
    for (const cl of node.classes) {
        const clBlock = cl.block;
        const clElement = cl.element;
        const clModName = cl.modName;
        if (clElement) {
            // NO_PARENT_BLOCK
            if (!node.anyParent((pCls) => pCls.some((pCl) => pCl.className === clBlock))) {
                errors.push({
                    code: BEMErrorCode.NO_PARENT_BLOCK,
                    className: cl.className,
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
                        elLocation: node.el.sourceCodeLocation,
                        secondElLocation: sameParent.el.sourceCodeLocation,
                    });
                }
            }
        }

        // ONLY_MODIFIER
        if (clModName) {
            const needClass = clElement ? `${clBlock}__${clElement}` : clBlock;
            if (!node.classes.some((icl) => icl.className === needClass)) {
                errors.push({
                    code: BEMErrorCode.ONLY_MODIFIER,
                    className: cl.className,
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
                    elLocation: node.el.sourceCodeLocation,
                    secondElLocation: sameParent.el.sourceCodeLocation,
                });
            }
        }

        // ELEMENT_OF_ELEMENT
        if (clModName) {
            if (!node.classes.some((icl) => icl.element && icl.className !== cl.className)) {
                errors.push({
                    code: BEMErrorCode.ELEMENT_OF_ELEMENT,
                    className: cl.className,
                    elLocation: node.el.sourceCodeLocation,
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
        switch (err.code) {
            case BEMErrorCode.NO_PARENT_BLOCK:
                rv += 'Элемент используется без блока в родителях';
                break;
            case BEMErrorCode.RECURSIVE_ELEMENT: {
                const parentLoc = locString(err.secondElLocation) ?? '';
                rv += `Элемент вложен в элемент с таким же именем${parentLoc}`;
                break;
            }
            case BEMErrorCode.RECURSIVE_BLOCK: {
                const parentLoc = locString(err.secondElLocation) ?? '';
                rv += `Блок вложен в блок с таким же именем${parentLoc}`;
                break;
            }
            case BEMErrorCode.ELEMENT_OF_ELEMENT:
                rv += 'Не может быть элемента у элемента';
                break;
        
            default:
                break;
        }
        return rv;
    })
    
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

    checkBEMRules(): string[] | null {
        const errors: BEMError[] = [];
        traverseBEMNode(this.#topNode, errors);
        return parseErrors(errors);
    }
}