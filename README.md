# gshml

npm i -g gshml
会自动在当前目录创建.hml文件，格式如下，

srcFolder是源图片路径
dstFolder是目标图片路径
cacheFolder是缓存目录
files是所有文件的相对路径，可以单独设置tiny为false使他不能用tinypng压缩
设置high,mid,low对应的图片压缩比例

{
  "srcFoldler": "test/src",
  "dstFolder": "test/dst",
  "cacheFolder": "test/cache",
  "files": {
    "bbb/seller.png": {
      "high": 1,
      "mid": 0.75,
      "low": 0.5,
      "tiny": true
    },
    "campain.png": {
      "high": 1,
      "mid": 0.75,
      "low": 0.2,
      "tiny": true
    }
  }
}
