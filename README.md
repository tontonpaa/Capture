## なんか適当に作ったものです
captureです

人間かロボットか確かめるあれ

## 使い方
html文にこれを<body>タグ内に入れます

v2の場合
```
<div id="linkData" data-url-success="https://example.com"></div>
<button onclick="verifyAndGo()">移動</button>
</div>
<script src="https://da-wa.com/capture/capture-v2.js"></script>
```

v1の場合
```
<div id="linkData" data-url-success="https://example.com"></div>
<button onclick="verifyAndGo()">移動</button>
</div>
<script src="https://da-wa.com/capture/capture-v1.js"></script>
```

https://example.com  

のところは認証したときの移動先リンクです

自由に変えてください


文字認証のみ対応

認証方法も雑です

あくまでも趣味として作ったものにすぎません

これを実際に使うのはやめましょう



### v1とv2の違い

v1はjavascriptのアラート機能を使ったものに対し、v2はオリジナルUI(動的生成)です

バグは多分あります


### サンプルコード
サンプルコードです

普通に不要ですが、一応置いときます


```
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>サンプル</title>
</head>
<body>

<div id="linkData" data-url-success="https://example.com"></div>
<button onclick="verifyAndGo()">移動</button>
</div>
<script src="capture-v2.js"></script>
</body>
</html>
```
