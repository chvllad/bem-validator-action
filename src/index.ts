import { getInput, setOutput, setFailed, error as printError, startGroup, endGroup } from '@actions/core';
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
        return ['Не найден тэг html'];
    }
    const body = findElementByTag(htm, 'body');
    if (!body) {
        return ['Не найден тэг body'];
    }
    const tree = BEMClassTree.create(body);
    if (tree instanceof MyError) {
        const loc = locString(tree.location, ' ') ?? '';
        return [loc + tree.data];
    }
    return tree.checkBEMRules();
}


async function run() {
  try {
    const html = getInput('html');

    let hasErrors = false;

    glob(html, (err, matches) => {
        if (err) {
            setFailed('Ошибка при парсинге аргумента html: ' + err.message);
        }
        for (const fileName of matches) {
            const content = fs.readFileSync(fileName);
            const errors = parseHtml(content.toString());
            if(errors) {
                startGroup(`--- ${fileName} ---`);
                for (const error of errors) {
                    printError(error);
                }
                endGroup();
                hasErrors = true;
            }
        }
    });
    if (hasErrors) {
        setFailed('При проверке были найдены ошибки');
        return;
    }
    setOutput('result', 0);
  } catch (error: any) {
    setFailed(error.message);
  }
}

run();
