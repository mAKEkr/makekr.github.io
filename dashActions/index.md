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
```
npm install cap --save
```
외부의 예제에서는 많이들 ```node-pcap```혹은 ```pcap```을 이용하라고 권장한다. 그렇지만 해당 패키지는 유지보수가 제대로 안되는 상황이며 컴파일 과정에서도 오류가 발생했다.
Cap은 내가 찾은 nodejs의 패키지중에서 그나마 최근에 유지보수 되고있으며 가장 dependencies가 적고 컴파일에 큰 문제가 없었던 저장소이다.

그렇기에 Cap이라는 다소 생소한 라이브러리를 이용하도록 한다.

### 코드 작성하기
```javascript
const Cap = require('cap').Cap,
      decoders = require('cap').decoders; // 디코더가 없으면 날패킷으로 분석할 수 밖에 없다

const Capture = new Cap()
const netBuffer = Buffer.alloc(65535)
const linkType = Capture.open('wlan0', // 장치에 맞는 포트를 적어두고(모른다면 ifconfig 쳐서 확인하라)
                  '(udp and src port 68 and dst port 67 and udp[247:4] == 0x63350103) and src host 0.0.0.0', // 필터링 조건문이다.
                  // dash-button과 node-dash-button 저장소를 참고하여 가져왔다.
                  // 위의 조건문은 ARP검색용 조건문으로 보면된다.
                  10 * 1024 * 1024,
                  netBuffer)

Capture.setMinBytes && Capture.setMinBytes(0)

Capture.on('packet', (nbytes, trunc) => {
  const rawPacket = buffer.slice(0, nbytes).toString('hex')
  const connection = decoders.Ethernet(netBuffer)
  
  console.log(rawPacket, connection)
});
```
작성한 코드를 토대로 파일을 입력하면 다음과 같이 표시된다

### 중복 리퀘스트 문제
리퀘스트를 전송하면 리퀘스트가 2번씩 들어오게 된다. 중복적인 실행을 방지하기 위하여 다음과 같이 필터링 해주도록 한다.

`Capture.setMinBytes && Capture.setMinBytes(0)` 아래에 다음과 같이 작성한다

```javascript
const Timestamp = {}, // 모듈화를 위하여 object화. 모듈화는 차후 아래에 설명
      delayTime = 3000 // 대시버튼 액션이 두번 실행됨으로써 중복실행을 방지하기 위한 딜레이시간. ms로써 라우터별로 조정.
```
packet event의 Listener안에 다음과 같이 작성한다
```javascript
  const requestTime = new Date().getTime() // 리퀘스트 타임을 별도 기록
  if (Timestamp[connection.info.srcmac] === undefined) { // timestamp가 지정되지 않았을 경우 timestamp를 설정함
    Timestamp[connection.info.srcmac] = requestTime - delayTime // timestamp에 초기 delayTime만큼 줄여 초기 실행이 아예 되지 않는 문제를 해결
  }
  
  if (requestTime - Timestamp[connection.info.srcmac] >= delayTime) {
    // 실행할 코드 내용
  }
```

### 개별 대시버튼별로 모듈화하기
`console.log`가 들어가는 위치에 코드를 작성하면 작동한다.

대시버튼이 한개라면 저기에 코드를 작성하고 끝내는것만으로 상관없겠지만, 기왕 세팅 힘들게 한거 여러개 대시버튼을 이용해서 모듈화 시켜서 대시버튼별로 동작을 쉽게 할 수 있도록 만들어보자.

위의 const 선언 부분을 다음과 같이 수정해주자.

```javascript
const Timestamp = {}, // 모듈화를 위하여 object화
      delayTime = 3000, // 대시버튼 액션이 두번 실행됨으로써 중복실행을 방지하기 위한 딜레이시간. ms로써 라우터별로 조정.
      WhiteList = ['fc:a6:67:ba:29:c0'] // 사용할 대시버튼의 mac어드레스 주소.
```

위의 Listener안에 작성한 코드의 하단 `실행할 코드 내용`이라 적혀있는 주석을 다음과 같이 대체해준다

```javascript
    if (WhiteList.indexOf(connection.info.srcmac) > -1) {
      require(`./actions/${connection.info.srcmac.replace(/\:/g, '')}`)()
    } else {
      console.log(`unknown device ARP Probe ${connection.info.srcmac}`)
    }

    Timestamp[connection.info.srcmac] = requestTime
```

코드를 해석하면 다음과 같다.
1. 패킷을 감지하여 이벤트가 발동한다.
2. MAC Address별 타임스탬프의 기록을 확인한다(기록이 아예 없으면 3번, 있으면 4번)
3. MAC Address의 타임스탬프 기록을 새로 작성하되, 사용자가 지정한 딜레이 만큼의 시간을 제외하여 초기 실행에 문제가 없도록 정의해준다
4. 패킷이 마지막으로 사용자가 버튼을 누른 뒤에 딜레이를 합한것보다 늦게 감지되었다면
5. 화이트리스트 배열에 해당 MAC Adress가 존재하는지 확인.
6. 존재한다면 actions 폴더 안에 있는 MAC Address에서 인식자':'를 제외한 문자열과 동일한 파일을 require를 통해 불러오고(Fs.stat으로 감지는 생략했다) 바로 실행하며, 존재하지 않는다면 `unknown device ARP Probe (MAC Address)`를 띄운다
7. 타임스탬프의 시간을 갱신하며 종료한다.

## 트위터 연동 대시 버튼 메세지 작성하기
개별 대시버튼별로 모듈화 한 덕분에 손쉽게 처리가 가능하게 되었다.

개발자 등록과정 및 토큰 발급과정은 생략한다.
파일은 `actions/0000000000.js` 와 같은 식으로 작성한다.
```javascript
/* current-dash-button=Charmin */
// 파일명이 MAC Address와 일치하기때문에 기본적으로 파악하기 힘들다고 보았다.
// 그래서 위와 같이 알아볼 수 있는 라벨링을 통하여 어떤 대시버튼인지 알 수 있도록 만들었다.

const Twitter = require('twitter')

module.exports = () => {
  const client = new Twitter({
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
  });

  client.post('statuses/update', {
    status: 'message'
  }, (err, tweet, response) => {
    console.log(err)
  })
}
```

## Amazon Dash Button으로 샤오미 선풍기 제어하기
선풍기 제어에 있어서는 miio 라이브러리를 이용한다.

miio는 샤오미의 IoT기기들을 제어하기 위한 nodejs 라이브러리로, 다양한 기기들을 지원하는것이 이점이다.

### 기본 전략 구상하기

### 기기정보 알아내기


### miio의 Generic API(Low-level API)사용하기
miio에서 지원하는 기기들은 메소드를 호출하는 형태로 간단하게 조절이 가능하지만, 아쉽게도 내가 사용하고있는 `zhimi.fan.v3`은 miio에서 기본 연결만 지원하는 Generic(포괄적) 기기로 인식된다.

그렇기에 기기에서 불러 올 수 있는 정보의 내용과 부를 수 있는 정보의 내용들을 알아야만 한다.

기본적인 연결은 miio라이브러리를 이용하나, 기기에 특정 액션을 전송할때에는 https://github.com/aholstenson/miio/issues/159 해당 이슈에 적힌 내용의 데이터들을 토대로 작성해야된다.

### 코드 작성하기
```javascript
/* current-dash-button=Charmin */
const Miio = require('miio')

module.exports = async () => {
  // miio 라이브러리는 Promise로 동작하기때문에 async를 통하여 제어하도록 했다.
  const device = await Miio.device({
    address: 'ipaddr',
    token: 'token'
  })
  
  /*
    가져올 수 있는 정보의 내용들이다. 무조건 array로 반환되니 key별 method를 기억해두고 있어야한다.
    그리고 제어 불가능한 부분이 있으니 꼭 제어 가능한 부분들은 링크를 참고하길 바란다.
    await device.call('get_prop', ['temp_dec', 'humidity', 'angle', 'speed', 'poweroff_time',
                         'power', 'ac_power', 'battery', 'angle_enable', 'speed_level',
                         'natural_level', 'child_lock', 'buzzer', 'led_b']))
  */
  
  const status = await device.call('get_prop', ["power", "speed_level"])

  let setSpeed = 0
  
  // 속도를 체크해봤을때 1~100까지 작동한다.
  // 그렇기에 어느정도 꼼수를 부려보았다.
 
  if (status[1] < 25) { // 속도가 25 미만일 경우 25로 설정
    setSpeed = 25
  } else if (status[1] < 50) { // 속도가 50 미만일 경우 50으로 설정
    setSpeed = 50
  } else if (status[1] < 75) { // 속도가 75 미만일 경우 75로 설정
    setSpeed = 75
  } else if (status[1] === 75) { // 속도가 75일경우
    if (status[0] === "off") { // 기계가 꺼져있으면
      setSpeed = 1 // 속도를 1로 정하고
      await device.call('set_power', ["on"]) // 전원을 켠다
    } else { // 기계가 켜져있으면
      setSpeed = 0 // 속도를 지정하지 않고
      await device.call('set_power', ["off"]) // 전원을 끈다
    }
  }

  if (setSpeed !== 0) { // 속도 변수가 0이 아닐경우에만
    await device.call('set_speed_level', [setSpeed]) // 속도를 setSpeed 변수로 지정한다
  }

  device.destroy() // 기기와의 연결을 끊는다
}
```

## Nodejs 코드 daemon으로 구동시키기(pm2)
forever, nodemon과 같은것들 대신에 pm2를 이용하기로 결정했다.

추가로 pm2는 keymetrics.io와 연동하여 외부에서 모니터링이 가능하다. 연동과정은 직접 PM2 저장소 혹은 keymetrics.io 에 접속하여 확인하길 바란다.

### 심볼릭 링크 생성
```
ln -s /volume2/@appstore/Node.js_v8/usr/local/bin/pm2 pm2
```
시놀로지는 노드와 같은 패키지를 설치하면 일종의 독립된 컨테이너로 실행하고있다. 심볼릭 링크를 생성해야지만 pm2의 글로벌 명령어를 실행 가능하다.

### pm2를 통한 daemon실행
```
npm install -g pm2
pm2 start (script file) --name="dash-button"
pm2 list
```
`pm2 list`는 확인을 위한 명령어이다.

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
