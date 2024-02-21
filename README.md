# JPRS 指定事業者一覧

JPRS の[指定事業者 五十音順 一覧](https://jprs.jp/registration/list/meibo/meibo_a.html)を元にしたデータです。

以下は本データを使ってホスト情報に IPv6 アドレスを登録でき、かつ DNSSEC の署名鍵を登録できる事業者のみを抽出する例です。

```terminal
$ jq -r '.[] | select(.dnssec.configurable and .ipv6.configurable) | "\(.companyName) \(.serviceName) (\(.serviceURL))"' registrars.json
株式会社インターネットイニシアティブ IIJ インターネット (http://www.iij.ad.jp/)
KDDI株式会社 KDDIインターネット (http://www.kddi.com/business/internet/index.html)
CSC Japan株式会社 CSC コーポレートドメインズ, Inc. (https://www.cscglobal.com/service/dbs/digital-brand-services/)
GMOインターネットグループ株式会社 お名前.com (https://www.onamae.com/)
株式会社スマートバリュー スマートバリュー (http://www.smartvalue.ad.jp/)
株式会社日本レジストリサービス JPDirect (http://jpdirect.jp/)
株式会社ヒューメイア 株式会社ヒューメイア (https://www.humeia.co.jp/)
マークモニター・ジャパン合同会社 ドメインサービス (https://www.markmonitor.com/)
```
