/*****************************************************
 * ※※※※※※※※※※※※※※※※※※※※※※※※
 * ※※※  SJValidator 1.0 소개 ※※※ 
 * ※※※※※※※※※※※※※※※※※※※※※※※※
 *****************************************************/
/******************************************************
 ***  < 제공자의 운영사이트 ^^ >								***
 *** -그냥 블로그	: http://blog.naver.com/restarted	***
 *** -정보 블로그	: http://forgiveall.tistory.com/	***
 *** -유튜브1		: http://youtube.com/chooseamenu	***
 *** -유튜브2		: http://youtube.com/아직 미개설    	***
 *** 												***
 *** 문의 : restarted@naver.com						***
 ******************************************************/
/**  ***** ***** ***** *****  ***** ***** ***** ****  */
/**  			 	아래부터는 소스 입니다. 				  */
/**  ***** ***** ***** *****  ***** ***** ***** ****  */











/* 필수 생성 객체 */

/* 크로스브라우징을 위한 설정 및 보조함수 모음 */
var sjvHelper = new SJValidatorHelper();
/* 핵심 기능 */
var sjvalidator = new SJValidator(); 
var errorManager = new SJErrorManager();

sjvHelper.cross.addEventListener(window, 'load', sjvalidator.setValidatorAfterLoad);







/**************************************************
 * *** SJValidator 유효성 검사기 ***
 * 
 * @author	SUJUNG KIM
 * @since	2015.05.05
 * @param	query
 **************************************************/
function SJValidator(){
	var allVMap = [];
	this.nowSubmitForm;
	
	this.submit = function(someObj){
		/** <form>의 name이 직접 오든, 그 안의 요소가 오든 <form>을 찾아서 searchForm변수에 연결한다. **/
		var searchForm = someObj;
		var formName = '';
		while (searchForm){
			if (searchForm.tagName && searchForm.tagName.toLowerCase() == 'form') break;
			searchForm = someObj.parentNode;
		}		
		formName = searchForm.name;
		this.nowSubmitForm = searchForm;
		
		/** 요소 스캔해서 이벤트 다시 추가 **/
		this.setValidatorAfterLoad();
		
		
		/** 폼이 있나 확인 **/
		if (allVMap[formName]
		&& allVMap[formName]['CHECK']=='form'
		&& allVMap[formName]['OBJS']){
			for(var fIdx=0; fIdx<allVMap[formName]['OBJS'].length ;fIdx++){
				if(allVMap[formName]['OBJS'][fIdx] == searchForm
				&& allVMap[formName]['OBJS'][fIdx].onsubmit){
					if (allVMap[formName]['OBJS'][fIdx].onsubmit()) {
						allVMap[formName]['OBJS'][fIdx].submit();
						return true;
					}else{							
						return false;
					}
				}
			}
		}		
	};
	
	/* sjquery를 저장 후, set() 호출*/
	this.add = function(query){
		var qr = new SJQueryReader(query);
		var name = qr.getVal('name');
		allVMap[name] = qr.getMap(true);		
		allVMap[name]['OBJS'] = [];
		allVMap[name]['GROUPSMAP'] = [];
		this.set(allVMap[name]);
	};
	
	/* sjquery를 적용 */
	this.set = function(oneVMap){	
		oneVMap['OBJS'] = document.getElementsByName(oneVMap['NAME']);
		var objs = oneVMap['OBJS'];
		if (objs.length==0) return false;
		
		var check = oneVMap['CHECK'];
		var format = oneVMap['FORMAT'];
		var maxLength = oneVMap['MAXLENGTH'];		
		var group = oneVMap['GROUP'];
		var groupsMap = oneVMap['GROUPSMAP'];
		
		
		 
		
		
		for (var i=0; i<objs.length; i++){
			/** submit 했을 때 체크 (저장된 모든 요소의 blur event 발생) **/	
			if (check=='form'){ 
				objs[i].onsubmit = function(event){ return checkOnSubmit(event, allVMap); };		
			}
			
			/** 기본 maxlength속성도 적용하기 */
			if (maxLength != undefined && check!='money') {
				objs[i].setAttribute('maxlength', maxLength);
			/** 기본 maxlength속성 적용해제 */
			}else if(maxLength == undefined && objs[i].getAttribute('maxlength') != null){
				objs[i].setAttribute('maxlength', null);
			}
			
			/** keydown 했을 때 체크 (주로 입력제어) **/
			if (check=='char' || check=='num' || check=='kor' || check=='eng' || check=='money' || check=='email' 
			|| format!=undefined || maxLength!=undefined){
				objs[i].onkeydown = function(event){ return checkOnKeyDown(event, this, oneVMap); };
			}
			/** keyup 했을 때 체크 (주로 형식제어) **/
			if (check=='char' || check=='num' || check=='kor' || check=='eng' || check=='money' 
			|| format!=undefined || maxLength!=undefined){
				objs[i].onkeyup = function(event){ return checkOnKeyUp(event, this, oneVMap); };
			}
			/** blur(focus잃음) 했을 때 체크 **/
			if (true){
				objs[i].onblur = function(event){
					/* 기본 체크 */
					if (!checkOnBlur(event, this, oneVMap)) return false;
					/* 그룹 체크 */
					return checkGroup(event, this, group, groupsMap, allVMap);
				};
			}			
			/** change 했을 때 체크 (즉각 반응이 필요한 애들) **/
			if(check=='radio' || check=='checkbox' || check=='file' || check=='select' || check=='money' 			
			|| objs[i].type=='radio' || objs[i].type=='checkbox' || objs[i].type=='file' || objs[i].tagName.toLowerCase()=='select'){
				objs[i].onchange = function(event){ return checkOnChange(event, this, oneVMap); };
			}
		}
	};
	
	/* 모든 sjquery를 obj에 적용 */
	this.setAll = function(){
		for (name in allVMap){
			this.set(allVMap[name]);
		}
	};
	/* 배열에 등록된 name을 초기화 */
	this.removeAll = function(){
		allVMap = [];
	};
	
	/* window.onload() event 발생시 호출 */
	this.setValidatorAfterLoad = function(){
		/* HTML에 설정된 SJV의 속성들을 긁어 모으는 JSON오브젝트 */
		var getherSetedQuery = {};
		/** data-*속성으로 설정된 유효성검사 정보 **/
		var sjvAttributes = ['CHECK','MINLENGTH','MAXLENGTH','MINCHECK','MAXCHECK','MINVALUE','MAXVALUE','MAXSIZE','FILETYPE','GROUP','REQUIRED','FORMAT','NO-AUTO-FORMAT','ZERO'];
		for (var i=0; i<sjvAttributes.length; i++){
			var setedObj = sjvHelper.cross.querySelectorAll('[data-' +sjvAttributes[i].toLowerCase()+ ']');
			for (var j=0; j<setedObj.length; j++){
				var name = setedObj[j].name;
				if(getherSetedQuery[name]==undefined) getherSetedQuery[name] = 'name=' +name;
				getherSetedQuery[name] += ', ' +sjvAttributes[i]+ '=' +setedObj[j].getAttribute('data-' +sjvAttributes[i]);				
			}
		}
		/** data-validator속성으로 설정된 유효성검사 정보를 적용 **/
		var setedObj = sjvHelper.cross.querySelectorAll('[data-validator]');
		for (var j=0; j<setedObj.length; j++){
			var name = setedObj[j].name;
			if(getherSetedQuery[name]==undefined) getherSetedQuery[name] = 'name=' +name;
			getherSetedQuery[name] += ', ' +setedObj[j].getAttribute('data-validator');
		}
		/** HTML에서 가져온 속성 정보들을 등록 **/
		for (name in getherSetedQuery){			
			sjvalidator.add(getherSetedQuery[name]);	
		}
		/** 이미 저장된 유효성검사 설정 정보를 모두 적용 (validator.add()으로 저장된 설정 정보) **/
		sjvalidator.setAll();
	};
}



/****************************************************
 * *** SJErrorManager 에러메세지 관리자 *** 
 * 
 * @author SUJUNG KIM
 * @since 2015-05-05 
 ****************************************************/
function SJErrorManager(){
	/* ErrorMessage의 시작부분에 표시될 기호 */
	var	errorSign = '*';
	/* 2개 이상의 Error가 발생할 경우 구분자 */
	var	nextErrorDivider = '<br/>';
	/* ErrorMessage가 축적되는 변수 */
	var	nowStatus = '';
	/* ErrorCode:ErrorMessage */
	var	errorMsgs = {
				MINLENGTH:'최소 {}자 이상 입력해 주세요.'
			,	MAXLENGTH:'최대 {}자까지만 입력 가능합니다.'
			,	MINVALUE:'{}이상 입력해 주세요.'
			,	MAXVALUE:'최대 {}까지 입력가능합니다.'
			,	MINCHECK:'{}개 이상 체크해 주세요.'
			,	MAXCHECK:'최대 {}개 까지 체크가 가능합니다.'
			,	FILETYPE:'{}파일만 가능합니다.'
			,	MAXSIZE:'용량제한 : {}이하'
			,	REQUIRED:'필수 입력 사항입니다.'
			,	GROUP:'모두 입력해 주세요.'
			,	KEYCHAR:'문자만 입력 가능합니다.'
			,	KEYNUM:'숫자만 입력 가능합니다.'
			,	KEYENG:'영어만 입력 가능합니다.'
			,	KEYKOR:'한글만 입력 가능합니다.'
			,	KEYLANG:'영어 외 문자만 입력 가능합니다.'
			,	FORMATCHAR:'문자 형식만 가능합니다.'
			,	FORMATNUM:'숫자 형식만 가능합니다.'
			,	FORMATENG:'영어만 가능합니다.'
			,	FORMATKOR:'한글만 가능합니다.'
			,	FORMATLANG:'영어 외 문자만 가능합니다.'
			,	FORMATEMAIL:'EMAIL형식만 가능합니다.'
			,	FORMAT:'{} 형식에 맞지 않습니다.'
	};
	/* nowStatus의 값이 있으면, 에러가 난 상황(true) */
	this.isOnError = function(){
		return (nowStatus!='');
	};
	/* 발생한 에러코드의 메세지를 nowStatus에 축적 */
	this.occured = function(errorCode, param){
		var occuredErrorMsg = '';
		if (errorMsgs[errorCode] == undefined){
			occuredErrorMsg = 'OCCURED CODE : ' + errorCode;	
		}else{
			if (param != undefined){
				occuredErrorMsg = errorMsgs[errorCode].replace('{}', param);
			}else{
				occuredErrorMsg = errorMsgs[errorCode];
			}
		}
		nowStatus += this.isOnError() ? nextErrorDivider : '';
		nowStatus += errorSign + occuredErrorMsg;
	};
	/* input의 CSS 변경(유효성 이상 없음) */
	this.setNormalInput = function(input){
		sjvHelper.cross.classList.remove(input, 'sj-errormanager-input-error');
	};
	/* input의 CSS 변경(유효성 이상 발생) */
	this.setAnormalInput = function(input){
		sjvHelper.cross.classList.add(input, 'sj-errormanager-input-error');
	};
	/* 에러메세지를 출력한다. */
	this.print = function(input, placeToPrint, time){
		this.removeErrorDiv(input, placeToPrint);
		if (this.isOnError()){
			this.setAnormalInput(input);
			this.showErrorDiv(input, placeToPrint, time);
			nowStatus = '';
		}
	};

	
	/* 사용자가 에러메세지 기호를 재설정 가능하도록 함 */
	this.setErrorSign = function(newErrorSign){
		errorSign = newErrorSign;		
	};
	/* 사용자가 에러메세지 구분자를 재설정 가능하도록 함 */
	this.setNextErrorDivider = function(newNextErrorDivider){
		nextErrorDivider = newNextErrorDivider;
	};
	/* 사용자가 에러메세지를 재설정 가능하도록 함 */
	this.setErrorMsg = function(errorCode, newErrorMsg){
		errorMsgs[errorCode] = newErrorMsg; 
	};
	
	
	/* 에러메세지div 생성 */
	this.getNewErrorDiv = function(time){
		var errorDiv = document.createElement('div');
		errorDiv.id = (time>0) ? 'divShowWarningWhile' : 'divShowWarningLong';
		sjvHelper.cross.classList.add(errorDiv, 'sj-errormanager-errordiv');
		errorDiv.innerHTML = nowStatus;		
		return errorDiv;
	};
	/* 새로 생성된 에러메세지div를 placeToPrint에 appendChild함.*/
	this.showErrorDiv = function(input, placeToPrint, time){
		var errorDiv = this.getNewErrorDiv(time);
		placeToPrint.appendChild(errorDiv);
		/* 인스턴트 참고메세지 설정 */
		if(time > 0){
			setTimeout(
					function(){
						if(errorDiv.id!=undefined){
							if (errorDiv.id.indexOf('Long') == -1){
								this.setNormalInput(input);	
							}
						}
						if(errorDiv!=undefined){							
							parent.removeChild(errorDiv);
						}
					}	
				,	time
			);	
		}
	};
	/* 기존 에러메세지div 지우기*/
	this.removeErrorDiv = function(input, placeToPrint){
		var errorDiv = placeToPrint.lastChild;
		if(errorDiv.id!=undefined){
			if (errorDiv.id.indexOf('divShowWarning') != -1){
				this.setNormalInput(input);
				placeToPrint.removeChild(errorDiv);
			}
		}
	};	
}



/********************************************************
 * *** SJQueryReader 쿼리 해석기 ***
 * 
 * 함수를 객체생성할 때 다음과 같은 규칙의 문자열 파라미터 값을 1개 넣는다. 
 * 예) 'name=empNm, check=char, minLength=2, maxLength=20, required' 
 * - 항목 구분자(,), 속성과 값 구분자(=)
 * - getVal(property) 	: 해당 속성(property)의 값을 호출
 * - getMap() 			: JASON형식 OBJECT로 반환
 *  
 * @author SUJUNG KIM
 * @since 2015-04-30
 * @param query  
 ********************************************************/
function SJQueryReader(query){
	var querys = query.split(',');
	
	/* 원하는 속성의 값을 반환 (생성자로 들어온 sjquery문 중에서) */
	this.getVal = function(property){
		for (var i=0; i<querys.length; i++){
			var pv = querys[i].split('=');
			
			if (pv[0]!=undefined && pv[0].trim()==property){				
				if (pv[1]!=undefined && pv[1]!=''){
					pv[1] = pv[1].trim();
				}else{
					pv[1] = pv[0].trim();
				}
				return pv[1];
			}else{
				continue;
			}
		}
		return undefined;
	};
	
	/* Map?JSON?형식으로 반환 */
	this.getMap = function(){
		var map = {};
		var wantUpperCase = (arguments[0]!=undefined) ? true:false;  /* 인자 하나 들어왔을 때 */
		for (var i=0; i<querys.length; i++){
			var pv = querys[i].split('=');
			
			if (pv[0]!=undefined){
				pv[0] = (wantUpperCase) ? pv[0].trim().toUpperCase() : pv[0].trim();
				if (pv[1]!=undefined && pv[1]!=''){
					pv[1] = pv[1].trim();
				}else{
					pv[1] = pv[0];
				}
				map[pv[0]] = pv[1];
			}else{
				continue;
			}
		}
		return map;
	};
}






/****************************
 *  When submit event occur 
 ****************************/
function checkOnSubmit(event, allVMap){
	var flag = true;
	var goingToFocus = undefined;
	
	/* 등록된 요소 모두를 유효성검사 */ 
//	for(var chk=0; chk<allVMap.length; chk++){
//		alert(allVMap.length + allVMap[chk]);
	for(name in allVMap){
		/*check가 form인 것을 제외하고 모두 유효성검사를 실시 */
		var targetEls = sjvalidator.nowSubmitForm.elements;
		var targetEls2 = allVMap[name]['OBJS'];
		for (var eIdx=0; eIdx<targetEls.length ;eIdx++){
		for (var oIdx=0; oIdx<targetEls2.length ;oIdx++){
		if(targetEls2[oIdx]==targetEls[eIdx]){
				
			if(targetEls2[oIdx].onblur 
			&& !targetEls2[oIdx].onblur()){
				flag = false;
				if (goingToFocus==undefined) {
					goingToFocus = allVMap[name]['OBJS'][0];
				}
			}
				
		}
		}
		}
		
		/*check가 money이면 ,를 제거한다.*/		
		if(allVMap[name]['CHECK'] == 'money') {
			targetEls2[0].value = targetEls2[0].value.setOnlyNum();
		}
		/*zero가 0보다 크면 상황에 맞게 0을 붙인다.*/		
		if(allVMap[name]['ZERO'] != undefined && allVMap[name]['ZERO'] > 0) {
			var val = parseInt(targetEls2[0].value);
			var zero = parseInt(allVMap[name]['ZERO']);
			var zeroNeeds = zero - val;
			var zeroStr = '';
			if (zeroNeeds > 0) {
				for (var zIdx=0; zIdx<zeroNeeds.length; zIdx++){
					zeroStr += '0';
				}
				targetEls2[0].value = zerStr + val;
			} 
		}
	}
	
	/* submit실패시 */ 
	if (!flag){
		/* 다시 money형식으로 변환 */
		for(i in allVMap){
			if(allVMap[i]['CHECK'] == 'money') {
				allVMap[i]['OBJS'][0].value = allVMap[i]['OBJS'][0].value.setMoney();
			}
		}
		/* 재입력을 요구하는 포커스 이동 */
		goingToFocus.focus();
	}
	
	return flag;
}
/*****************************
 *  When keydown event occur 
 *****************************/
function checkOnKeyDown(event, input, oneVMap){
	/* (del, backspace)가 아닌 기능키이면 그냥 return true*/	
//	if (checkKeyFnDelete(event)) return true;
	if (checkKeyFn(event) && !checkKeyFnDelete(event)) return true;
	
	var checkType = true;
	var checkLength = true;
	var judge = false;
	
	var check = oneVMap['CHECK'];
	var maxLength = oneVMap['MAXLENGTH'];
	var format = oneVMap['FORMAT'];
	var noAutoFormat = oneVMap['NO-AUTO-FORMAT'];
	
	/* 형식 체크 */
	if (check=='char'){
		checkType = checkKeyChar(event);			
		if(!checkType) errorManager.occured('KEYCHAR');
	}else if (check=='eng'){
		checkType = checkKeyEng(event);			
		if(!checkType) errorManager.occured('KEYENG');
	}else if (check=='kor'){
		checkType = checkKeyKor(event);			
		if(!checkType) errorManager.occured('KEYKOR');
	}else if (check=='lang'){
		checkType = checkKeyLang(event);			
		if(!checkType) errorManager.occured('KEYLANG');
	}else if(check == 'num' || check == 'money'){			 
		checkType = checkKeyNum(event);
		if(!checkType) errorManager.occured('KEYNUM');
	}
	
	
	/* 커스텀 포맷 체크 */	
	if (format!=undefined && noAutoFormat!='NO-AUTO-FORMAT'){
		/* 키보드의 키가 처음 눌려졌을 떄의 값 (input.value, caretPosition)  */
		if (oneVMap['memoryOfValue'] == undefined) oneVMap['memoryOfValue'] = input.value;
		if (oneVMap['memoryOfCp'] == undefined) oneVMap['memoryOfCp'] = sjvHelper.getCaretPos(input);
	} 
	/* 최대 글자 체크 */	
	if (maxLength!=undefined){		
		/* check가 money일 경우 표시된 ,를 제외한 글자 수 */
		if (check == 'money'){
			checkLength = checkKeyMax(event, input.value.setOnlyNum(), maxLength);
		}else {			
			if (!checkKeyFnDelete(event)){
				checkLength = checkKeyMax(event, input.value, maxLength);	
			}
		}
		/* 영역이 선택되어있을 경우 최대글자체크를 통과시킨다. */
		if (!checkLength && 0 < sjvHelper.getSelectionRange(input)) checkLength = true;
		if (!checkLength) errorManager.occured('MAXLENGTH', maxLength);
	}
	
	/* 판정, 참고메세지 */
	judge = checkType && checkLength;
	errorManager.print(input, input.parentNode);
	return judge;
}
/*****************************
 *  When keyup event occur 
 *****************************/
function checkOnKeyUp(event, input, oneVMap){	
	/* (del, backspace)가 아닌 기능키이면 그냥 return true*/
	if (checkKeyFn(event) && !checkKeyFnDelete(event)) {
		return true;
	}
	var check = oneVMap['CHECK'];
	var format = oneVMap['FORMAT'];
	var noAutoFormat = oneVMap['NO-AUTO-FORMAT'];	
	
	/* caretPosition 저장 */
	var cp = sjvHelper.getCaretPos(input);
	var moveCp = 0;
	var beforeLength = input.value.length;
	
	/* 각 형식에 맞게 조정 */
	if (check=='money'){
		input.value = input.value.setMoney();
		moveCp = (input.value.length - beforeLength);
	}
	if (check=='char' && !checkFormatChar(input.value)){
		input.value = input.value.setOnlyChar();
	}
	if (check=='eng' && !checkFormatEng(input.value)){
		input.value = input.value.setOnlyEng();
	}
	if (check=='kor' && !checkFormatKor(input.value)){
		input.value = input.value.setOnlyKor();
	}
	if (check=='lang' && !checkFormatLang(input.value)){
		input.value = input.value.setOnlyLang();
	}
	if (check=='num' && !checkFormatNum(input.value)){
		input.value = input.value.setOnlyNum();
	}
	
	/* 커스텀 포맷 체크 */
	if (format!=undefined && noAutoFormat!='NO-AUTO-FORMAT'){
		/* 키보드의 키가 처음 눌려졌을 떄의 값 (input.value, caretPosition)  */
		var beforeValue = oneVMap['memoryOfValue'];
		var beforeCp = oneVMap['memoryOfCp'];
		var addedLength = 0;
		var updateValue = undefined;		
		if (beforeValue != undefined) addedLength = input.value.length - beforeValue.length;
		
		if(addedLength > 0){
			/* 작성되어 있던 문자의 앞 */
			var v1 = input.value.substring(0, cp - addedLength);			
			/* 작성한 문자 */
			var v2 = input.value.substring(beforeCp, cp);			
			/* 카렛 뒤의 문자(형식적 표기) */
			var v3 = input.value.substring(cp, input.value.length);
			/* 작성한 문자만 SJVFormat을 적용, 늘어나는 양의 정보를 얻어서 caretPosition 이동*/
			var cv2 = (v2).setSJVFormat(format, v1.length);			
			moveCp = (cv2.length - v2.length);
			/* 작성한 문자와 그 뒤의 문자의 SJVFormat을 없애기 */
			var removedFormat = beforeValue.removeSJVFormat(format, beforeCp);
			var cv3 = removedFormat.substring(beforeCp, beforeValue.length);
			/* SJVFormat 적용 */
			updateValue = (v1 + v2 + cv3).setSJVFormat(format);
		} else if(addedLength < 0){
			/* 카렛 앞 문자 */
			var v1 = input.value.substring(0, cp);
			/* 지운 문자(형식적 표기) */
			var v2 = '';  
			/* 카렛 뒤의 문자(형식적 표기) */
			var v3 = input.value.substring(cp, input.value.length);
			/* 카렛 뒤의 문자의 SJVFormat을 없애기 */
			var removedFormat = beforeValue.removeSJVFormat(format, cp - addedLength);
			var cv3 = removedFormat.substring(cp - addedLength, removedFormat.length);
			/* SJVFormat 적용 */
			updateValue = (v1 + cv3).setSJVFormat(format);
		}		
		if (updateValue!=undefined && input.value!=updateValue) {			
			input.value = updateValue;
		}
		oneVMap['memoryOfValue'] = undefined;
		oneVMap['memoryOfCp'] = undefined;
	}
	
	/* caretPosition 설정 */
//	if(moveCp > 0) sjvHelper.setCaretPos(input, cp + moveCp);
	sjvHelper.setCaretPos(input, cp + moveCp);
}
/*************************
 *  When blur event occur 
 *************************/
function checkOnBlur(event, input, oneVMap){
	var checkFormat = true;
	var checkLength = true;
	var checkRequired = true;
	var judge = false;
	
	var check = oneVMap['CHECK'];
	var required = oneVMap['REQUIRED'];
	var objs =  oneVMap['OBJS'];
	var minLength =  oneVMap['MINLENGTH'];
	var maxLength =  oneVMap['MAXLENGTH'];
	var format =  oneVMap['FORMAT'];
	
	/* 텍스트 특수*/
	if(input.value!=''){
		/* 형식 체크 */
		if (check=='char'){
			checkFormat = checkFormatChar(input.value); 
			if(!checkFormat) errorManager.occured('FORMATCHAR');
		}else if(check=='eng'){
			checkFormat = checkFormatEng(input.value); 
			if(!checkFormat) errorManager.occured('FORMATENG');
		}else if(check=='kor'){
			checkFormat = checkFormatKor(input.value); 
			if(!checkFormat) errorManager.occured('FORMATKOR');
		}else if(check=='lang'){
			checkFormat = checkFormatLang(input.value); 
			if(!checkFormat) errorManager.occured('FORMATLANG');
		}else if(check=='num'){
			if (!checkFormatNum(input.value)) input.value = input.value.setOnlyNum();
			checkFormat = checkFormatNum(input.value);
			if(!checkFormat) errorManager.occured('FORMATNUM');
			/* 수치 범위 체크 */
			var minVal =  oneVMap['MINVALUE'];
			var maxVal =  oneVMap['MAXVALUE'];
			if (minVal==undefined){
				minVal = 0;
			}
			if (maxVal==undefined){
				maxVal = 1;
				for (var i=0; i<input.value.length; i++){
					maxVal *= 10;					
				}
				maxVal -= 1;
			}
			if (!(minVal <= eval(input.value) && eval(input.value) <= maxVal)){
				checkFormat = false;
				errorManager.occured('MINVALUE', minVal);
				errorManager.occured('MAXVALUE', maxVal);
			}
		}else if(check=='email'){
			checkFormat = checkFormatEmail(input.value);
			if(!checkFormat) errorManager.occured('FORMATEMAIL');
		}
		
		/* 커스텀 포맷 체크 */
		if (format!=undefined){
			checkFormat = input.value.isSJVFormat(format);
			if(!checkFormat) errorManager.occured('FORMAT', format);
		}
	
		/* 최소 글자수 체크 */		
		if (minLength!=undefined){
			checkLength = checkMinLength(input.value, minLength);
			if(!checkLength) errorManager.occured('MINLENGTH', minLength);
		}	
		
		/* 최대 글자 체크 */	
		if (maxLength!=undefined && checkLength){
			/* check가 money일 경우 표시된 ,를 제외한 글자 수 */
			if (check=='money'){
				checkLength = checkMaxLength(input.value.setOnlyNum(), maxLength);
			}else {
				checkLength = checkMaxLength(input.value, maxLength);	
			}		
			if(!checkLength) errorManager.occured('MAXLENGTH', maxLength);
		}
	
		if (check=='money'){		
			input.value = input.value.setMoney();
		}
	}
	
	/* 체크박스 특수 */
	if(check=='checkbox' || input.type=='checkbox'){
		var minCheck =  oneVMap['MINCHECK'];
		var maxCheck =  oneVMap['MAXCHECK'];
		var checkedCnt = 0;		
		for(var i=0; i<objs.length; i++){
			if(objs[i].checked)	checkedCnt++;
		}
		if(minCheck!=undefined && checkedCnt < minCheck && checkedCnt>0){
			checkLength = false;
			errorManager.occured('MINCHECK', minCheck);
		}
		if(maxCheck!=undefined && checkedCnt > maxCheck){
			checkLength = false;
			input.checked = false;
			errorManager.occured('MAXCHECK', maxCheck);
		}
	}	
	
	/* 파일 특수 */
	if( (check=='file' || input.type=='file') && input.value!='' ){
		/*var fPath = input.value;*/
		var fName = input.files[0].name;
		var fType = fName.split('.')[fName.split('.').length-1];
		/*var fType = input.files[0].type;*/
		var fSize = input.files[0].size;
		var maxSize = oneVMap['MAXSIZE'];		
		var fileType =  oneVMap['FILETYPE'];
		
		if (fileType.toLowerCase().indexOf(fType.toLowerCase()) == -1){
			checkFormat = false;
			errorManager.occured('FILETYPE', fileType);
		}
		if ( fSize > maxSize.setOnlyNum() * maxSize.setOnlyEng().changeByteSize() ){
			checkLength = false;
			errorManager.occured('MAXSIZE', maxSize);
		}
	}
	
	
	/* 필수사항의 빈공간 판정, 참고메세지 */
	if (required=='REQUIRED'){
		if(input.value==''){
			checkRequired = false;
		}
		if(input.type=='radio' 
		|| input.type=='checkbox'){			
			checkRequired = false;
			for (var i=0; i<objs.length; i++){
				if(objs[i].checked){
					checkRequired = true;
				}
			}
		}
		if(!checkRequired){
			errorManager.occured('REQUIRED');
		}	
	}
	
	judge = checkFormat && checkLength && checkRequired;
	errorManager.print(input, input.parentNode);
	return judge;
}
/****************************
 * After blur event occured
 ****************************/
function checkGroup(event, input, group, groupsMap, allVMap){
	/* 그룹 모으기 (최초 1회만)*/
	if(group != undefined && groupsMap.length==0){
		for (name in allVMap){
			if (group == allVMap[name]['GROUP']){
				groupsMap.push(allVMap[name]);
			}
		}
	}
	
	/* 그룹 유효성 확인 */
	for (var i=0; i<groupsMap.length; i++){		
	for (var j=0; j<groupsMap[i]['OBJS'].length; j++){
		var obj = groupsMap[i]['OBJS'][j];
		if(!checkOnBlur(event, obj, groupsMap[i])){
			return false;
		}					
	}	
	}
	
	/* 그룹 빈공간 확인 */
	var checkGroupFullOrEmpty = true;
	for (var i=0; i<groupsMap.length; i++){
	for (var j=0; j<groupsMap[i]['OBJS'].length; j++){
		var obj = groupsMap[i]['OBJS'][j];
		if( !((input.value!='' && obj.value!='') || (input.value=='' && obj.value=='')) ){
			if(input.value=='') {
				errorManager.occured('GROUP');
				errorManager.print(input, input.parentNode);
			}
			if(obj.value=='') {
				errorManager.occured('GROUP');
				errorManager.print(obj, obj.parentNode);
			}
			checkGroupFullOrEmpty = false;
		}
	}
	}
	/* 그룹 모두 빈공간 확인 = true >> input을 원래 스타일로 복원 */
	if (checkGroupFullOrEmpty){
		errorManager.setNormalInput(input);
		for (var i=0; i<groupsMap.length; i++){
		for (var j=0; j<groupsMap[i]['OBJS'].length; j++){
			var obj = groupsMap[i]['OBJS'][j];
			errorManager.setNormalInput(obj);
		}
		}
	}
	return checkGroupFullOrEmpty;
}
/***************************
 * When change event occur
 ***************************/
function checkOnChange(event, input, oneVMap){	
	/* 블러 이벤트 호출로 돌림 */
	return checkOnBlur(event, input, oneVMap);
}





/*************************************
 * Basic validation check functions
 *************************************/
/* 키 체크 */
function checkKeyFn(event){ return (sjvHelper.isKeyFn(event.keyCode) && !sjvHelper.isKeySpace(event.keyCode)); }
function checkKeyFnDelete(event){ return (sjvHelper.isKeyDelete(event.keyCode) || sjvHelper.isKeyBackspace(event.keyCode)); }
function checkKeyChar(event){ return (sjvHelper.isKeyChar(event.keyCode) || sjvHelper.isKeyFn(event.keyCode)) && !sjvHelper.isKeySpace(event.keyCode); }
function checkKeyEng(event){ return (sjvHelper.isKeyEng(event.keyCode) || sjvHelper.isKeyFn(event.keyCode)) && !sjvHelper.isKeySpace(event.keyCode); }
function checkKeyKor(event){ return (sjvHelper.isKeyKor(event.keyCode) || sjvHelper.isKeyFn(event.keyCode)) && !sjvHelper.isKeySpace(event.keyCode); }
function checkKeyLang(event){ return (sjvHelper.isKeyLang(event.keyCode) || sjvHelper.isKeyFn(event.keyCode)) && !sjvHelper.isKeySpace(event.keyCode); }
function checkKeyNum(event){ return (sjvHelper.isKeyNum(event.keyCode) || sjvHelper.isKeyFn(event.keyCode)) && !sjvHelper.isKeySpace(event.keyCode); }
function checkKeyMax(event, value, maxLength){ return !value.isMoreKeyThan(maxLength) || (sjvHelper.isKeyFn() && !sjvHelper.isKeySpace(event.keyCode)) ; }
/* 형식 체크 */
function checkFormatChar(value){ return value.isFormatChar(); }
function checkFormatEng(value){	return value.isFormatEng(); }
function checkFormatKor(value){	return value.isFormatKor(); }
function checkFormatLang(value){ return value.isFormatLang(); }
function checkFormatNum(value){	return value.isFormatNum(); }
function checkFormatEmail(value){ return value.isFormatEmail(); }
function checkMinLength(value, minLength){ return !value.isLessThan(minLength); }
function checkMaxLength(value, maxLength){ return !value.isMoreThan(maxLength); }

























/*********************************** 
 * 				공통 모듈 
 ***********************************/
function SJValidatorHelper(){	
	/************************************************** 
	 * 			IE6, IE7, IE8, IE9, Firefox를 위한 배려 
	 * sjvHelper.cross.addEventListener(el, newEventName, fn);
	 * sjvHelper.cross.preventDefault(event);
	 * sjHelper.cross.stopPropagation(event);
	 * sjHelper.cross.srcElement(event);
	 * sjvHelper.cross.classList.add(el, classItem);
	 * sjvHelper.cross.classList.remove(el, classItem);
	 * sjvHelper.cross.querySelectorAll(selector);
	 * sjvHelper.cross.getBodyScrollX();
	 * sjvHelper.cross.getBodyScrollY();
 	 * sjvHelper.cross.disableSelection(el);
	 **************************************************/	
	var addEventListener = function(el, newEventName, fn, bl){
		/* FireFox는 이 작업을 선행하게하여 window.event객체를 전역으로 돌려야한다.*/
		if (navigator.userAgent.indexOf('Firefox') != -1) {			
			el.addEventListener(newEventName, function(e){window.event=e;}, true);
		}
		/* 일반 */
		if(el.addEventListener){			
			el.addEventListener(newEventName, fn)
		}else{
			el.attachEvent('on'+newEventName, fn);
		}			
	};
	var preventDefault = function(event){
		if(event && event.preventDefault){
			event.preventDefault();
		}else{			
		}
	};
	var stopPropagation = function(event){
		if(event && event.stopPropagation){
			event.stopPropagation();
		}else{
			event.returnValue = false; 
			event.cancelBubble = true;
		}
	};
	var srcElement = function(event){
		if(event && event.srcElement){
			return event.srcElement;
		}else{			
			return event.target;
		}
	};	
	var classList = { 		
			add: function(el, classItem){
					if (el.classList){
						el.classList.add(classItem);
					}else{
						el.className += ' ' +classItem+ ' ';
					}
				 }
		,	remove: function(el, classItem){
						if (el.classList){
							el.classList.remove(classItem);
						}else{
							while (el.className.indexOf(' ' +classItem+ ' ') != -1){
								el.className = el.className.replace(classItem + ' ', '');
							}		
							if (el.className.indexOf(classItem+ ' ') == 0){
								el.className = el.className.replace(classItem+ ' ', '');
							}
							if (el.className.indexOf(' ' +classItem) == el.className.length - classItem.length - 1){
								el.className = el.className.replace(' ' +classItem, '');
							}
						}
					}
	};	
	var querySelectorAll = function(selector){
		if(document.querySelectorAll){
			return document.querySelectorAll(selector);
		}else if(document.getElementsByTagName){
			/* Attribute */			
			var startIdx = selector.indexOf('[');
			var endIdx = selector.indexOf(']');
			var attr;
			var selectedList = [];
			if (startIdx != -1 && endIdx != -1){
				attr = selector.substring(startIdx +1, endIdx);
				/* 유효성검사에 맞는 Form 태그 들만 */
				var nodeNames = ['form', 'input', 'select', 'textarea'];
				for (var searchI=0; searchI< nodeNames.length; searchI++){
					var elements = document.getElementsByTagName(nodeNames[searchI]);					
					for (var searchJ=0; searchJ<elements.length; searchJ++){						
						if (elements[searchJ].getAttribute(attr) != undefined){
							selectedList.push(elements[searchJ]);
						}
					}
				}
			}
			return selectedList;		
		}
	};
	/*****
	 * 문서의 스크롤된 수치 반환
	 * IE8 : document.documentElement.scrollLeft 
	 * IE9 : window.pageXOffset 
	 * IE11 & others : document.body.scrollLeft 
	 *****/
	var getBodyScrollX = function(){
		var bodyPageX = 0;
		if (document.documentElement 
		&& document.documentElement.scrollLeft) bodyPageX = document.documentElement.scrollLeft;
		if (window.pageXOffset) bodyPageY = window.pageXOffset;
		if (document.body 
		&& document.body.scrollLeft) bodyPageX = document.body.scrollLeft;
		return bodyPageX;
	};
	var getBodyScrollY= function(){
		var bodyPageY = 0;
		if (document.documentElement
		&& document.documentElement.scrollTop) bodyPageY = document.documentElement.scrollTop;
		if (window.pageYOffset) bodyPageY = window.pageYOffset;
		if (document.body 
		&& document.body.scrollTop) bodyPageY = document.body.scrollTop;
		return bodyPageY;
	};
	var disableSelection = function (el){
		if (typeof el.ondragstart != 'undefined') el.ondragstart = function(){return false;};
		if (typeof el.onselectstart != 'undefined') el.onselectstart = function(){return false;};
		if (typeof el.oncontextmenu != 'undefined') el.oncontextmenu = function(){return false;};		
		if (typeof el.style.MozUserSelect != 'undefined') document.body.style.MozUserSelect = 'none';
	};
	this.cross = {
			addEventListener: addEventListener		
		,	preventDefault: preventDefault
		,   stopPropagation: stopPropagation
		,	srcElement: srcElement
		,	classList: classList
		,	querySelectorAll: querySelectorAll
		,	getBodyScrollX: getBodyScrollX
		,	getBodyScrollY: getBodyScrollY
		,	disableSelection: disableSelection
	};
	
	
	
	/*************************** 
	 * keyCode 판정함수  
	 ***************************/
	this.isKeyFn = function(keyCode){ return (keyCode<=46); };	
	this.isKeySpace = function(keyCode){ return (keyCode==32); };
	this.isKeyBackspace = function(keyCode){ return (keyCode==8); };
	this.isKeyDelete = function(keyCode){ return (keyCode==46); };
	this.isKeyChar = function(keyCode){ return (65<=keyCode && keyCode<=90) || (229<=keyCode);};
	this.isKeyEng = function(keyCode){ return (65<=keyCode && keyCode<=90);};
	this.isKeyKor = function(keyCode){ return (229<=keyCode);};
	this.isKeyLang = function(keyCode){ return (229<=keyCode);};
	this.isKeyNum = function(keyCode){ return ((48<=keyCode && keyCode<=57) || (96<=keyCode && keyCode<=105)); };
	this.key = function(keyCode){ return String.fromCharCode(keyCode); };	
	
	
	/*************************** 
	 * String의 부가함수 추가 
	 ***************************/
	String.prototype.trim = function(){ return this.replace(/^\s*/ ,"").replace(/\s*$/ ,""); };
	String.prototype.startsWith = function(str){ return this.indexOf(str)==0; };
	String.prototype.isFormatChar = function(){ return (this.search(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/ig) == -1); };
	String.prototype.isFormatEng = function(){ return (this.search(/[^a-zA-Z]/ig) == -1); };
	String.prototype.isFormatKor = function(){ return (this.search(/([^가-힣ㄱ-ㅎㅏ-ㅣ])/ig) == -1); };
	String.prototype.isFormatLang = function(){ return (this.search(/([a-zA-Z0-9!@#$%^&*()-_|\+.,])/i) == -1); };
	String.prototype.isFormatNum = function(){ return (this.search(/^(\d+)$/ig) != -1); };
	String.prototype.isFormatEmail = function(){ return (this.search(/^(\w+)[@](\w+)[.](\w+)$/ig) != -1); };
	String.prototype.isMoreKeyThan = function(maxLength){ return (this.length >= maxLength); };  
	String.prototype.isMoreThan = function(maxLength){ return (this.length > maxLength); };  
	String.prototype.isLessThan = function(minLength){ return (this.length < minLength); };
	String.prototype.setOnlyChar = function(){ return this.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ]/gi, ''); };
	String.prototype.setOnlyEng = function(){ return this.replace(/[^a-zA-Z]/gi, ''); };
	String.prototype.setOnlyKor = function(){ return this.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/gi, ''); };
	String.prototype.setOnlyLang = function(){ return this.replace(/([a-zA-Z0-9!@#$%^&*()-_|\+.,])/i, ''); };
	String.prototype.setOnlyNum = function(){ return this.replace(/\D/g, ''); };
	String.prototype.setMoney = function(){
		var reg = /(^[+-]?\d+)(\d{3})/;
		var num = this.replace(/\D/g, '');
		while(reg.test(num)){
			num = num.replace(reg, '$1' + ',' + '$2');
		};
		return num; 
	};
	String.prototype.changeByteSize = function(){  
		var byteSize = 1;
		if (this.toLowerCase().indexOf('b') != -1)
		if (this.toLowerCase().indexOf('kb') != -1) byteSize *= 1024;  
		if (this.toLowerCase().indexOf('mb') != -1) byteSize *= (1024 * 1024);
		if (this.toLowerCase().indexOf('gb') != -1) byteSize *= (1024 * 1024 * 1024);				
		if (this.toLowerCase().indexOf('tb') != -1) byteSize *= (1024 * 1024 * 1024 * 1024);
		return byteSize;
	};
	String.prototype.isSJVFormat = function(format){ 	
		if (format.length == this.length){
			/* n: 숫자, c: 문자, a: 모두  (ymdhis: 날짜시간 형식)*/
			for (var i=0; i<format.length; i++){
				var mf = format.charAt(i);
				var mc = this.charAt(i);
				if (mf=='n' && mc.isFormatNum()){
				}else if (mf=='c' && mc.isFormatChar()){
				}else if ( (mf=='y'||mf=='m'||mf=='d'||mf=='h'||mf=='i'||mf=='s') && mc.isFormatNum()){
				}else if (mf=='a'){
				}else if (mf!='n' && mf!='c' && mf!='a' && mf==mc){
				}else{
					return false;
				}		
			}
			return this.isSJVFormatDateTime(format);
		}
		return false;
	};
	String.prototype.isSJVFormatDateTime = function(format){
		/* 수치가 매칭하냐? */
		var isMatching = function(str, format, matchingFormat, min, max){
			var machingIndex = format.indexOf(matchingFormat);		
			if (machingIndex != -1){
				var target = str.substring(machingIndex, machingIndex+2);
				if (!isNaN(target) && target.length==2 && parseInt(target) >= min && parseInt(target) <= max){
				}else{
					return false;
				}
			}
			return true;
		};
		if (!isMatching(this, format, 'mm', 1, 12)) return false;
		if (!isMatching(this, format, 'dd', 1, 31)) return false;
		if (!isMatching(this, format, 'hh', 0, 23)) return false;
		if (!isMatching(this, format, 'mi', 0, 59)) return false;
		if (!isMatching(this, format, 'ss', 0, 59)) return false;
		return true;
	};
	String.prototype.setSJVFormat = function(format, start){	
		if (start==undefined) start = 0;
		var value = this;
		for (var i=start; i<value.length + start; i++){
			var mf = format.charAt(i);
			var mc = value.charAt(i-start);
			/* 문자 바꾸기*/
			if (mf!='n' && mf!='c' && mf!='a' && mf!='y' && mf!='m' && mf!='d' && mf!='h' && mf!='i' && mf!='s' && mf!=mc){			
				var v1 = value.substring(0, i-start);
				var v2 = value.substring(i-start, value.length);
				value = v1 + mf + v2;
			}
		}
		
		return value;
	};
	String.prototype.removeSJVFormat = function(format, start){
		if (start==undefined) start = 0;
		var value = this;	
		for (var i=this.length-1; i>=start; i--){
			var mf = format.charAt(i);
			var mc = this.charAt(i);
			/* 문자 바꾸기*/
			if (mf!='n' && mf!='c' && mf!='a' && mf!='y' && mf!='m' && mf!='d' && mf!='h' && mf!='i' && mf!='s' && mf==mc){
				var v1 = value.substring(0, i);
				var v2 = value.substring(i+1, value.length);			
				value = v1 + v2;
			}		
		}
		return value;
	};
	
	
	
	
	
	
	
	
	
	
	
	/*****
	 * 기타 공통 모듈
	 *****/	
	/* CREATE NEW DIV */
	this.getNewDiv = function (idVal, classVal, inner){
		var newDiv = document.createElement('div');
		newDiv.id = idVal;
		newDiv.className = classVal;
		newDiv.innerHTML = inner;
		return newDiv;
	};	
	
	
	/***********************
	 * Get focus position  
	 ***********************/
	this.getCaretPos = function (ctrl) {
		var caretPos = 0;
		/* IE Support*/
		if (document.selection) {
			ctrl.focus ();
			var sel = document.selection.createRange();
			sel.moveStart ('character', -ctrl.value.length);
			caretPos = sel.text.length;
		/* Firefox support *//* Chrome support */
		}else if (ctrl.selectionStart || ctrl.selectionStart == '0'){
			caretPos = ctrl.selectionStart;
		}
		return (caretPos);
	};
	/***********************
	 * Set focus position  
	 ***********************/
	this.setCaretPos = function (ctrl, pos){
		/* Chrome support */
		if(ctrl.setSelectionRange){
			ctrl.focus();
			ctrl.setSelectionRange(pos, pos);
			/* 파이어폭스는 이상하게 다시 원위치를 시킨다... 이상하다..*/
		}else if (ctrl.createTextRange) {
			var range = ctrl.createTextRange();
			range.collapse(true);
			range.moveEnd('character', pos);
			range.moveStart('character', pos);
			range.select();
		}
	};
	/***********************
	 * Get SelectionRange  
	 ***********************/
	this.getSelectionRange = function (ctrl){
		var caretRange;
		/* IE Support*/
		if (document.selection) {
			var sel = document.selection.createRange();
			caretRange = sel.text.length;
		}else if (ctrl.selectionStart || ctrl.selectionStart == '0'){
			caretRange = ctrl.selectionEnd - ctrl.selectionStart;
		}
		return caretRange;
	};
}



















