import { getInput, setOutput, setFailed, error as printError, startGroup, endGroup, info as printInfo } from '@actions/core';
import { parse } from "parse5";
import { BEMClassTree } from "./bem";
import { locString } from './bem/classtree';
import { MyError } from './bem/utils';
import glob from "glob";
import fs from "fs";

const findElementByTag = (el: MyElement, tagName: string): MyElement | null => {
  return el.childNodes?.find((el) => el.tagName && el.tagName === tagName) ?? null;
};


const parseHtml = (data: string): string[] | null => {
    const doc = parse(data, {
        sourceCodeLocationInfo: true,
    }) as any as MyElement;

    const htm = findElementByTag(doc, 'html');
    if (!htm) {
        return ['✖ Не найден тэг html'];
    }
    const body = findElementByTag(htm, 'body');
    if (!body) {
        return ['✖ Не найден тэг body'];
    }
    const tree = BEMClassTree.create(body);
    if (tree instanceof MyError) {
        const loc = locString(tree.location, ' ') ?? '';
        return [loc + tree.data];
    }
    const rv = tree.checkBEMRules();
    if (!rv) {
        printInfo('  Дерево классов:');
        printInfo(tree.getClassTree(2));
    }
    return rv;
}


function run() {
  try {
    const html = getInput('html');

    let hasErrors = false;

    const matches = glob.sync(html);

    for (const fileName of matches) {
        printInfo('Проверка ' + fileName);
        const content = fs.readFileSync(fileName);
        const errors = parseHtml(content.toString());
        if(errors) {
            printInfo('  ⚠️ Найдены ошибки:');
            for (const error of errors) {
                printError('  ' + error);
            }
            hasErrors = true;
        }
    }

    if (hasErrors) {
        setFailed('При проверке были найдены ошибки');
    } else {
        setOutput('result', 0);
    }
  } catch (error: any) {
    setFailed(error.message);
  }
}

run();
