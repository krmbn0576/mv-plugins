//=============================================================================
// AtsumaruOpenLink.js
//
// Copyright (c) 2018 RPGアツマール開発チーム(https://game.nicovideo.jp/atsumaru)
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
//=============================================================================

(function () {
    'use strict';

    // 既存のクラスとメソッド名を取り、そのメソッドに処理を追加する
    function hook(baseClass, target, f) {
        baseClass.prototype[target] = f(baseClass.prototype[target]);
    }
    function hookStatic(baseClass, target, f) {
        baseClass[target] = f(baseClass[target]);
    }
    // プラグインコマンドを追加する
    function addPluginCommand(commands) {
        hook(Game_Interpreter, "pluginCommand", function (origin) { return function (command, args) {
            origin.apply(this, arguments);
            if (commands[command]) {
                commands[command].apply(this, [command].concat(args));
            }
        }; });
    }
    // Promiseが終了するまでイベントコマンドをウェイトするための処理を追加する
    function prepareBindPromise() {
        if (Game_Interpreter.prototype.bindPromiseForRPGAtsumaruPlugin) {
            return;
        }
        // ソフトリセットのタイミングでローディングカウンターを初期化
        hook(Game_Temp, "initialize", function (origin) { return function () {
            origin.apply(this, arguments);
            this._loadingCounterForRPGAtsumaruPlugin = 0;
        }; });
        // 通信中のセーブは許可しない。ハードリセットしてロードした後、
        // その通信がどんな結果だったのか、成功したか失敗したかなどを復元する方法はもはやないため
        hookStatic(DataManager, "saveGame", function (origin) { return function () {
            return $gameTemp._loadingCounterForRPGAtsumaruPlugin === 0 && origin.apply(this, arguments);
        }; });
        // Promiseを実行しつつ、それをツクールのインタプリタと結びつけて解決されるまで進行を止める
        Game_Interpreter.prototype.bindPromiseForRPGAtsumaruPlugin = function (promise, resolve, reject) {
            var _this = this;
            var $gameTempLocal = $gameTemp;
            $gameTempLocal._loadingCounterForRPGAtsumaruPlugin++;
            this._index--;
            this._promiseResolverForRPGAtsumaruPlugin = function () { return false; };
            promise.then(function (value) { return _this._promiseResolverForRPGAtsumaruPlugin = function () {
                $gameTempLocal._loadingCounterForRPGAtsumaruPlugin--;
                _this._index++;
                delete _this._promiseResolverForRPGAtsumaruPlugin;
                if (resolve) {
                    resolve(value);
                }
                return true;
            }; }, function (error) { return _this._promiseResolverForRPGAtsumaruPlugin = function () {
                for (var key in _this._eventInfo) {
                    error[key] = _this._eventInfo[key];
                }
                error.line = _this._index + 1;
                error.eventCommand = "plugin_command";
                error.content = _this._params[0];
                switch (error.code) {
                    case "BAD_REQUEST":
                        throw error;
                    case "UNAUTHORIZED":
                    case "FORBIDDEN":
                    case "INTERNAL_SERVER_ERROR":
                    case "API_CALL_LIMIT_EXCEEDED":
                    default:
                        console.error(error.code + ": " + error.message);
                        console.error(error.stack);
                        if (Graphics._showErrorDetail && Graphics._formatEventInfo && Graphics._formatEventCommandInfo) {
                            var eventInfo = Graphics._formatEventInfo(error);
                            var eventCommandInfo = Graphics._formatEventCommandInfo(error);
                            console.error(eventCommandInfo ? eventInfo + ", " + eventCommandInfo : eventInfo);
                        }
                        $gameTempLocal._loadingCounterForRPGAtsumaruPlugin--;
                        _this._index++;
                        delete _this._promiseResolverForRPGAtsumaruPlugin;
                        if (reject) {
                            reject(error);
                        }
                        return true;
                }
            }; });
        };
        // 通信待機中はこのコマンドで足踏みし、通信に成功または失敗した時にPromiseの続きを解決する
        // このタイミングまで遅延することで、以下のようなメリットが生まれる
        // １．解決が次のコマンドの直前なので、他の並列処理に結果を上書きされない
        // ２．ゲームループ内でエラーが発生するので、エラー発生箇所とスタックトレースが自然に詳細化される
        // ３．ソフトリセット後、リセット前のexecuteCommandは叩かれなくなるので、
        //     リセット前のPromiseのresolverがリセット後のグローバルオブジェクトを荒らす事故がなくなる
        hook(Game_Interpreter, "executeCommand", function (origin) { return function () {
            if (this._promiseResolverForRPGAtsumaruPlugin) {
                var resolved = this._promiseResolverForRPGAtsumaruPlugin();
                if (!resolved) {
                    return false;
                }
            }
            return origin.apply(this, arguments);
        }; });
    }

    /*:
     * @plugindesc RPGアツマールで外部リンクを開くプラグインです
     * @author RPGアツマール開発チーム
     *
     * @help
     *
     * プラグインコマンド:
     *   OpenLink <url>         # <url>を開く
     *   リンク表示 <url>         # コマンド名が日本語のバージョンです。動作は上記コマンドと同じ
     */
    var openLink = window.RPGAtsumaru && window.RPGAtsumaru.popups.openLink;
    prepareBindPromise();
    addPluginCommand({
        OpenLink: OpenLink,
        "リンク表示": OpenLink
    });
    function OpenLink(command, url) {
        if (openLink) {
            this.bindPromiseForRPGAtsumaruPlugin(openLink(url));
        }
    }

}());
