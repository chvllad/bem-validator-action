import BEMClass from "./class";
import { MyError, ParseError } from "./utils";

export default class BEMNode {
    classes: BEMClass[];
    children: BEMNode[];
    parent: BEMNode | null;
    el: MyElement;

    constructor(el: MyElement, classArray: BEMClass[], parent: BEMNode | null) {
        parent?.children.push(this);
        this.parent = parent;
        this.classes = classArray;
        this.children = [];
        this.el = el;
    }

    static create(el: MyElement, className: string | null, classSet: Set<string>, parent: BEMNode | null): BEMNode | MyError {
        let classArray: BEMClass[] = [];
        if (className) {
            const classes = className?.split(/\s+/);
            for (const cn of classes) {
                const bem = BEMClass.create(cn);
                if (bem instanceof MyError) {
                    return new MyError(`✖ Ошибка в тэге ${el.tagName}: ${bem.data}.`, el.sourceCodeLocation);
                }
                classSet.add(cn);
                classArray.push(bem);
            }
        }

        return new BEMNode(el, classArray, parent);
    }

    anyParent(fn: (el: BEMClass[]) => boolean): boolean {
        return this.findParent(fn) !== null;
    }

    findParent(fn: (el: BEMClass[]) => boolean): BEMNode | null {
        let parent = this.parent;
        if (!parent) {
            return null;
        }
        while (parent) {
            if (fn(parent.classes)) {
                return parent;
            }
            parent = parent.parent;
        }
        return null;
    }
}