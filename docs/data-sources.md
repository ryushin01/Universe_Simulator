# 데이터 출처

## 텍스처 (`public/textures/`)

| 파일                                                                                        | 출처                                                                                                  | 라이선스  |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| `mercury`, `venus`, `moon`, `mars`, `jupiter`, `saturn`, `saturn-ring`, `uranus`, `neptune` | [Solar System Scope](https://www.solarsystemscope.com/textures/) 2K 텍스처                            | CC BY 4.0 |
| `earth-albedo`, `earth-lights`, `earth-clouds`                                              | [three.js 예제 텍스처](https://github.com/mrdoob/three.js/tree/r160/examples/textures/planets) (r160) | MIT       |

Solar System Scope 텍스처는 NASA 고도·영상 자료를 바탕으로 만들어졌고(미탐사 지역은 비슷한 지형으로 채움), 1024×512 WebP로 줄였습니다(`cwebp -q 78 -resize 1024 512`). 토성 고리는 알파를 살려 1024×64로 줄였습니다. 지구 색·불빛은 2048×1024와 작은 화면용 1024×512(`-1024`) 두 벌이고, 구름(1024×512)은 알파 채널에 구름 양이 들어 있습니다. 세레스·갈릴레이 위성·타이탄·명왕성·핼리 혜성·아포피스는 텍스처 없이 셰이더 잡음으로 그립니다.

화면의 ‘자료 출처’ 펼침에도 같은 출처를 적었습니다(CC BY 4.0 표기).

## 궤도 요소

| 자료                                           | 출처                                                                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 행성·명왕성 (평균 궤도 요소와 세기당 변화율)   | E. M. Standish, [Keplerian Elements for Approximate Positions of the Major Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), NASA JPL (1800~2050년 표) |
| 세레스, 아포피스, 핼리 혜성, 유성우 모천체 7개 | [JPL Small-Body Database API](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) (`full-prec=1`, 2026년 11월 조회)                                                      |
| 자전축·본초 자오선                             | IAU WGCCRE 2015 보고서 (Archinal et al. 2018)                                                                                                                    |
| 달                                             | 평균 궤도 요소와 교점·근지점 세차 (Meeus, _Astronomical Algorithms_ 기반 근사)                                                                                   |
| 갈릴레이 위성                                  | Meeus의 평균 경도 (1976년 기준)                                                                                                                                  |

핼리 혜성은 1968년 접촉 궤도 요소의 모양(e, i, Ω, ω)에 1986→2061년 평균 주기에 맞춘 긴반지름(17.857 AU)을 써서 2061년 7월 28일 근일점을 기준으로 삼았습니다.

## 천체 자료

| 자료                       | 내용                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 행성 물리량                | NASA Planetary Fact Sheet의 반지름·질량·중력·자전·평균 기온 (위성 수는 2025년 기준)                                                                     |
| 이웃 별 32곳               | 적경·적위·거리·분광형·질량·반지름·광도·온도 (널리 알려진 대략값)                                                                                        |
| 우리 은하·국부 은하군 천체 | 적경·적위·거리·크기 (대략값). 은하 좌표 변환은 ICRS → 은하 좌표 회전 행렬(J2000)                                                                        |
| 우주 거대 구조 17곳        | 방향·공동 거리·크기 대략값. 분류는 [나무위키 ‘우주 거대 구조’](https://namu.wiki/w/%EC%9A%B0%EC%A3%BC%20%EA%B1%B0%EB%8C%80%20%EA%B5%AC%EC%A1%B0)를 참고 |
| 유성우 9개                 | 극대 태양 황경·ZHR·복사점·속도 (국제유성기구 IMO 값 기준)                                                                                               |

## 모델 근거

| 모델           | 참고                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 태양 진화      | Sackmann, Boothroyd & Kraemer (1993) _Our Sun III_; Schröder & Smith (2008) _Distant future of the Sun and Earth revisited_ |
| 거주 가능 영역 | Kopparapu et al. (2013)                                                                                                     |
| 충돌 크레이터  | Collins, Melosh & Marcus (2005) _Earth Impact Effects Program_                                                              |
| 궤도 편향      | DART 운동량 증폭 β(약 3.6), 중력 견인선(Lu & Love 2005)                                                                     |
| 초신성 오존    | Gehrels et al. (2003), 감마선 폭발은 Thomas et al. (2005), 킬로노바는 Perkins et al. (2024)                                 |
| 지구 궤도 이동 | Korycansky, Laughlin & Adams (2001) _Astronomical engineering_                                                              |
| 은하 충돌      | Toomre & Toomre (1972)의 제한된 N체 방식                                                                                    |
| 우주 거미줄    | Zel'dovich (1970) 근사, 성장 인자는 평탄 ΛCDM 적분 해 (Heath 1977)                                                          |

수치는 모두 교육용으로 단순화했습니다. 피해 규모와 구조물 효과는 대략적인 크기만 보여 줍니다.
