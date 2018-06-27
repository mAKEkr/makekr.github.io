# Amazon Dash Hack Guide with Synology DSM 6.2

## 발단
샤오미 선풍기가 유행할 시절, 샤오미 선풍기를 구매했지만 딱 한가지 치명적인 단점을 모르고있었다. 리모콘이 없다는것.

신버전은 리모콘이 달려 나오지만, 구버전과 호환되지 않았고 딱히 리모콘 없이 불편함을 잘 모르고 쓰고있는 나로써는 가족들이 간단하게 제어하게 만들기 위한 리모콘만 만들면 됐다.

이게 이 뻘짓의 시초다.

## 준비물
- Amazon Dash Button(IoT가 아닌 일반 버튼을 대상으로 이야기한다, IoT버전은 별도 스니핑 없이 AWS와 연동하여 Lambda로 액션을 지정가능하다)
- USB Wi-Fi 어댑터
- Synology(DS216II 기준) 혹은 XPEnology

## 대시 버튼 연결하기
대시 버튼을 연결하기 위해서는 기본적으로 아마존 어플리케이션을 이용해야된다. iOS, 안드로이드 모두 다 잘 작동한다.
1. Amazon Shopping 어플리케이션을 설치한다(iOS는 Appstore, Android는 Play Store에서)
2. 아마존 계정 로그인
3. 왼쪽의 햄버거 메뉴 토글버튼을 눌러 메뉴를 열고 Your Account 클릭
4. 아래에 내리다보면 Manage your Dash devices 메뉴가 나온다
5. Set up a new Dash Button을 누르고 진행하다가
6. 상품선택란이 나오면 Amazon Shopping 어플리케이션을 끈다. 즉 Wi-Fi 연결까지만 진행한다.
7. 그 뒤에 manage your Dash devices란에서 Choose an item to complete setup이라는 에러가 나오는 항목이 있으면 제대로 등록된거다.

## Synology에서 준비하기

### SSH 활성화
1. 시놀로지 웹 대시보드에서 관리자 로그인
2. 제어판 -> 터미널 및 SNMP 진입
3. 터미널 항목의 SSH 서비스 활성화체크(모든 작업이 끝나거나 작업을 멈추는 도중이면 꼭 SSH 서비스를 끄도록 하자)

### OpenPKG 설치하기(opkg)
**아래서부터 모든 작업은 root로 진행한다.** 꼭 기억해라. `sudo -i`

Entware 저장소의 wiki항목 참조 https://github.com/Entware/Entware/wiki/Install-on-Synology-NAS

### pcap과 libpcap관련된것 설치
opkg의 설치가 끝났다는 가정하에
1. `opkg install libpcap gcc make` 를 입력하여 설치
2. `wget -qO- http://bin.entware.net/x64-k3.2/include/include.tar.gz | tar xvz -C /opt/include` 명령어로 include header 일괄 설치
3. 부족한 라이브러리 혹은 헤더가 있을지 없을지 모르지만 없으면 에러메세지 보고 설치

## 대시 버튼을 nodejs로 연결하기
이해를 쉽게 하기 위하여 '연결한다' 라고 했지만, 정확히 말하자면 '신호를 훔친다' 라고 해야된다.

아마존 대시 버튼은 Wi-Fi네트워크를 사용하기 때문에 아이피 할당 전에는 0.0.0.0으로 공유기에 우선적으로 ARP 패킷의 리퀘스트를 보낸다.

그 리퀘스트를 보낼때 전송되는 맥어드레스를 감지하여 신호를 엿보고 그걸 토대로 리퀘스트를 보내는것이 핵심이다.

### 대시버튼 이해하기
1. 대시버튼을 누른다
2. 전원이 켜지고 Wi-Fi 라우터에 신호를 요청한다
3. IP를 요청하기 위하여 MAC어드레스가 담긴 ARP패킷을 전송한다
4. 라우터에서 DHCP를 통해 IP를 할당해준 뒤 인터넷에 연결
5. 연결된 인터넷을 토대로 아마존에 리퀘스트 전송
6. 받은 리퀘스트를 통해 연결된 계정의 상품을 주문

완벽한 과정은 아니지만, 어느정도 간단하게 설명할 수준이라고 보면 된다. 우린 이 3-4번의 과정에 몰래 끼어들어갈 것이다.

### 패킷처리용 라이브러리 설치

### 코드 작성하기

### 개별 대시버튼별로 모듈화하기

## 트위터 연동 대시 버튼 메세지 작성하기
개별 대시버튼별로 모듈화 한 덕분에 손쉽게 처리가 가능하게 되었다.

개발자 등록과정 및 토큰 발급과정은 생략한다.

## Amazon Dash Button으로 샤오미 선풍기 제어하기
선풍기 제어에 있어서는 miio 라이브러리를 이용한다.

miio는 샤오미의 IoT기기들을 제어하기 위한 nodejs 라이브러리로, 다양한 기기들을 지원하는것이 이점이다.

기본적인 연결은 miio라이브러리를 이용하나, 기기에 특정 액션을 전송할때에는 https://github.com/aholstenson/miio/issues/159 해당 이슈에 적힌 내용의 데이터들을 토대로 작성해야된다.

### 기본 전략 만들기

### miio의 Generic API(Low-level API)사용하기

## Nodejs 코드 daemon으로 구동시키기(pm2)
forever, nodemon과 같은것들 대신에 pm2를 이용하기로 결정했다.
```
npm install -g pm2
pm2 start (script file) --name="dash-button"
pm2 list
```
추가로 pm2는 keymetrics.io와 연동하여 외부에서 모니터링이 가능하다. 연동과정은 직접 PM2 저장소 혹은 keymetrics.io 에 접속하여 확인하길 바란다.

### 심볼릭 링크 생성
```
ln -s /volume2/@appstore/Node.js_v8/usr/local/bin/pm2 pm2
```
시놀로지는 노드와 같은 패키지를 설치하면 일종의 독립된 컨테이너로 실행하고있다. 심볼릭 링크를 생성해야지만 pm2의 글로벌 명령어를 실행 가능하다.


## 결론
이런 뻘짓은 나혼자 하는걸로 충분하다. 다른사람들은 하지말자.

### 총 소요비용
```
대시 버튼 : 개당 4000원꼴
USB Wi-Fi 어댑터 : 8000원(집에 있지만 슬림형으로 다시 재구매했다)
```

### 총 소요시간
```
패키지 설치시스템 이해 그리고 새 정보 습득 : 6시간
코드작성 : 6시간(miio의 로우레벨 API와 관련된 도큐멘테이션이 아예 없었다. 직접 뜯어보며 확인하는것뿐)
총 소요시간 : 12시간
```
