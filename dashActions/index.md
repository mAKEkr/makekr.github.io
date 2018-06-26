# Amazon Dash Hack Guide(Ko)

## 발단
샤오미 선풍기

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
### OpenPKG 설치하기(opkg)
### pcap과 libpcap관련된것 설치
### nodejs 모듈 컴파일을 위한 gcc 설치
### 부족한 include library 설치

## 대시 버튼을 nodejs로 연결하기
이해를 쉽게 하기 위하여 '연결한다' 라고 했지만, 정확히 말하자면 '신호를 훔친다' 라고 해야된다.

아마존 대시 버튼은 Wi-Fi네트워크를 사용하기 때문에 아이피 할당 전에는 0.0.0.0으로 공유기에 우선적으로 리퀘스트를 보낸다.

그 리퀘스트를 보낼때의 맥어드레스를 감지하여 신호를 훔쳐가는것이 핵심이다.

### 대시버튼 이해하기
1. 대시버튼을 누른다
2. 전원이 켜지고 Wi-Fi 라우터에 신호를 요청한다

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

