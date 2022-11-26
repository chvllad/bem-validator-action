import { MyError } from "./utils";

const classRegex = /^([a-z-0-9]*)(?:__([a-z-0-9]+))?(?:_([a-z-0-9]*))?(?:_([a-z-0-9]*))?$/i;

export default class BEMClass {
    className: string;
    block: string;
    element?: string;
    modName?: string;
    modVal?: string;

    constructor(className: string, block: string, element?: string, modName?: string, modVal?: string) {
        this.className = className;
        this.block = block;
        this.element = element;
        this.modName = modName;
        this.modVal = modVal;
    }

    static create(className: string): BEMClass | MyError {
        const result = classRegex.exec(className);
        if (result == null) {
            return new MyError(`Класс '${className}' не соответствует БЭМу`);
        }
        const [_, block, element, modName, modVal] = result;
        return new BEMClass(className, block, element, modName, modVal);
    }
}