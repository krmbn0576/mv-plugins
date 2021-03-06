/*:
 * @plugindesc RPGアツマールのquery情報を変数にコピーする(Experimental版)プラグインです
 * @author RPGアツマール開発チーム
 *
 * @help
 *
 * プラグインコマンド:
 *   CopyQuery <id1> <id2>...         # param1をid1にコピー、param2をid2にコピー
 *   クエリ取得 <id1> <id2>...         # コマンド名が日本語のバージョンです。動作は上記コマンドと同じ
 */

import { toValidVariableId } from "./utils/parameter";
import { addPluginCommand } from "./utils/rmmvbridge";

declare const window: Window;
const query = window.RPGAtsumaru && window.RPGAtsumaru.experimental && window.RPGAtsumaru.experimental.query;

addPluginCommand({
    CopyQuery,
    "クエリ取得": CopyQuery
});

function CopyQuery(command: string) {
    const idStrList = Array.prototype.slice.call(arguments, 1) as string[];
    for (let i = 0; i < idStrList.length; ++i) {
        const key = "param" + String(i + 1);
        $gameVariables.setValue(toValidVariableId(idStrList[i], command, "id" + (i + 1)), query ? query[key] : "");
    }
}
