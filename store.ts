
import { create } from 'zustand';
import { Vector3, CatmullRomCurve3 } from 'three';
import { 
  GameStatus, 
  ChunkType, 
  TrackChunkData, 
  CHUNK_LENGTH, 
  CHUNKS_TO_RENDER,
  QuizQuestion,
  BOOST_MULTIPLIER,
  PENALTY_MULTIPLIER,
  EFFECT_DURATION,
  TRACK_WIDTH,
  ItemBoxData,
  ObstacleData,
  ObstacleType,
  Competitor,
  LessonData
} from './types';
import { soundManager } from './audio';

export const LESSON_CATALOG: Record<string, LessonData> = {
    'L1': { id: 'L1', title: '第 1 課', questions: [
        { id: 101, question: "等「ㄉㄞˋ」", options: ["代", "袋", "待"], correctIndex: 2 },
        { id: 102, question: "「ㄊㄚ」們(動物)", options: ["他", "她", "牠"], correctIndex: 2 },
        { id: 103, question: "「ㄊㄨㄣ」嚥", options: ["吞", "暾", "涒"], correctIndex: 0 },
        { id: 104, question: "一「ㄘㄨㄣˋ」", options: ["吋", "寸", "村"], correctIndex: 1 },
        { id: 105, question: "忙「ㄌㄨˋ」", options: ["陸", "鹿", "碌"], correctIndex: 2 },
        { id: 106, question: "「ㄅㄣ」跑", options: ["賁", "奔", "錛"], correctIndex: 1 },
        { id: 107, question: "「ㄅㄢ」馬", options: ["搬", "班", "斑"], correctIndex: 2 },
        { id: 108, question: "誠「ㄕˊ」", options: ["十", "實", "時"], correctIndex: 1 },
        { id: 109, question: "「ㄊㄢˊ」琴", options: ["談", "彈", "壇"], correctIndex: 1 },
        { id: 110, question: "快「ㄌㄜˋ」", options: ["垃圾", "圾", "樂"], correctIndex: 2 },
        { id: 111, question: "「ㄊㄚ」們(物品)", options: ["牠", "它", "他"], correctIndex: 1 },
        { id: 112, question: "長「ㄉㄨㄢˇ」", options: ["斷", "短", "段"], correctIndex: 1 },
        { id: 113, question: "慈「ㄅㄟ」", options: ["悲", "杯", "碑"], correctIndex: 0 },
        { id: 114, question: "受「ㄕㄤ」", options: ["傷", "商", "湯"], correctIndex: 0 },
        { id: 115, question: "「ㄩㄥˇ」遠", options: ["勇", "泳", "永"], correctIndex: 2 },
    ]},
    'L2': { id: 'L2', title: '第 2 課', questions: [
        { id: 201, question: "「ㄓㄡ」一", options: ["洲", "週", "周"], correctIndex: 1 },
        { id: 202, question: "「ㄒㄧㄡ」息", options: ["修", "休", "羞"], correctIndex: 1 },
        { id: 203, question: "「ㄐㄧㄚˋ」期", options: ["價", "架", "假"], correctIndex: 2 },
        { id: 204, question: "「ㄌㄧㄢˊ」接", options: ["連", "聯", "憐"], correctIndex: 0 },
        { id: 205, question: "作「ㄧㄝˋ」", options: ["葉", "業", "夜"], correctIndex: 1 },
        { id: 206, question: "中「ㄨˇ」", options: ["五", "午", "舞"], correctIndex: 1 },
        { id: 207, question: "「ㄅㄧㄥˋ」且", options: ["並", "病", "柄"], correctIndex: 0 },
        { id: 208, question: "「ㄊㄧˊ」醒", options: ["題", "提", "蹄"], correctIndex: 1 },
        { id: 209, question: "叫「ㄒㄧㄥˇ」", options: ["省", "醒", "擤"], correctIndex: 1 },
        { id: 210, question: "「ㄊㄨㄛ」地", options: ["脫", "拖", "托"], correctIndex: 1 },
        { id: 211, question: "「ㄇㄧˋ」蜂", options: ["密", "蜜", "秘"], correctIndex: 1 },
        { id: 212, question: "「ㄊㄠˊ」子", options: ["桃", "逃", "陶"], correctIndex: 0 },
        { id: 213, question: "「ㄉㄨ」嘴", options: ["督", "都", "嘟"], correctIndex: 2 },
        { id: 214, question: "「ㄗㄨㄟˇ」巴", options: ["嘴", "觜", "最"], correctIndex: 0 },
        { id: 215, question: "「ㄈㄤˊ」間", options: ["防", "房", "妨"], correctIndex: 1 },
    ]},
    'L3': { id: 'L3', title: '第 3 課', questions: [
        { id: 301, question: "「ㄊㄨㄥˇ」一", options: ["統", "筒", "桶"], correctIndex: 0 },
        { id: 302, question: "「ㄐㄧˋ」算", options: ["記", "紀", "計"], correctIndex: 2 },
        { id: 303, question: "車「ㄆㄧㄠˋ」", options: ["漂", "票", "飄"], correctIndex: 1 },
        { id: 304, question: "三「ㄐㄧㄠˇ」", options: ["角", "腳", "餃"], correctIndex: 0 },
        { id: 305, question: "黑「ㄅㄢˇ」", options: ["版", "板", "阪"], correctIndex: 1 },
        { id: 306, question: "課「ㄅㄣˇ」", options: ["本", "笨", "苯"], correctIndex: 0 },
        { id: 307, question: "情「ㄎㄨㄤˋ」", options: ["礦", "況", "曠"], correctIndex: 1 },
        { id: 308, question: "原「ㄧㄣ」", options: ["音", "陰", "因"], correctIndex: 2 },
        { id: 309, question: "以「ㄐㄧˊ」", options: ["級", "及", "吉"], correctIndex: 1 },
        { id: 310, question: "「ㄨㄣˊ」章", options: ["聞", "文", "紋"], correctIndex: 1 },
        { id: 311, question: "玩「ㄐㄩˋ」", options: ["具", "劇", "俱"], correctIndex: 0 },
        { id: 312, question: "道「ㄌㄧˇ」", options: ["李", "理", "禮"], correctIndex: 1 },
        { id: 313, question: "因「ㄘˇ」", options: ["此", "疵", "磁"], correctIndex: 0 },
        { id: 314, question: "「ㄓㄨㄣˇ」備", options: ["準", "准", "隼"], correctIndex: 0 },
        { id: 315, question: "具「ㄅㄟˋ」", options: ["倍", "備", "背"], correctIndex: 1 },
    ]},
    'L4': { id: 'L4', title: '第 4 課', questions: [
        { id: 401, question: "「ㄍㄨˇ」老", options: ["骨", "股", "古"], correctIndex: 2 },
        { id: 402, question: "「ㄉㄨㄥˇ」事", options: ["董", "懂", "孔"], correctIndex: 1 },
        { id: 403, question: "鄰「ㄐㄩ」", options: ["居", "拘", "車"], correctIndex: 0 },
        { id: 404, question: "一「ㄑㄩㄣˊ」", options: ["裙", "群", "羣"], correctIndex: 1 },
        { id: 405, question: "節「ㄕㄥˇ」", options: ["省", "審", "眚"], correctIndex: 0 },
        { id: 406, question: "浪「ㄈㄟˋ」", options: ["費", "廢", "肺"], correctIndex: 0 },
        { id: 407, question: "「ㄕㄤ」店", options: ["商", "傷", "湯"], correctIndex: 0 },
        { id: 408, question: "力「ㄌㄧㄤˋ」", options: ["諒", "輛", "量"], correctIndex: 2 },
        { id: 409, question: "貧「ㄑㄩㄥˊ」", options: ["穹", "窮", "瓊"], correctIndex: 1 },
        { id: 410, question: "水「ㄊㄨㄥˇ」", options: ["統", "筒", "桶"], correctIndex: 2 },
        { id: 411, question: "憤「ㄋㄨˋ」", options: ["怒", "努", "奴"], correctIndex: 0 },
        { id: 412, question: "髒「ㄌㄨㄢˋ」", options: ["亂", "爛", "戀"], correctIndex: 0 },
        { id: 413, question: "「ㄗㄥ」加", options: ["增", "曾", "爭"], correctIndex: 0 },
        { id: 414, question: "「ㄏㄨˊ」說", options: ["湖", "壺", "胡"], correctIndex: 2 },
        { id: 415, question: "觸「ㄇㄛ」", options: ["摸", "膜", "磨"], correctIndex: 0 },
    ]},
    'L5': { id: 'L5', title: '第 5 課', questions: [
        { id: 501, question: "「ㄊㄧㄝ」紙", options: ["貼", "帖", "鐵"], correctIndex: 0 },
        { id: 502, question: "今「ㄋㄧㄢˊ」", options: ["黏", "年", "連"], correctIndex: 1 },
        { id: 503, question: "年「ㄐㄧˊ」", options: ["級", "極", "即"], correctIndex: 2 },
        { id: 504, question: "「ㄕˇ」用", options: ["使", "史", "駛"], correctIndex: 0 },
        { id: 505, question: "「ㄏㄜˊ」作", options: ["和", "合", "河"], correctIndex: 1 },
        { id: 506, question: "「ㄙㄨㄟˊ」便", options: ["隨", "隋", "髓"], correctIndex: 0 },
        { id: 507, question: "「ㄍㄜˊ」壁", options: ["隔", "革", "格"], correctIndex: 0 },
        { id: 508, question: "「ㄕㄨㄟˋ」覺", options: ["說", "稅", "睡"], correctIndex: 2 },
        { id: 509, question: "「ㄒㄧㄠˋ」果", options: ["笑", "校", "效"], correctIndex: 1 },
        { id: 510, question: "順「ㄒㄩˋ」", options: ["續", "序", "敘"], correctIndex: 0 },
        { id: 511, question: "「ㄦˊ」且", options: ["而", "兒", "耳"], correctIndex: 0 },
        { id: 512, question: "並「ㄑㄧㄝˇ」", options: ["且", "切", "茄"], correctIndex: 0 },
        { id: 513, question: "「ㄆㄞˊ」隊", options: ["排", "牌", "徘"], correctIndex: 0 },
        { id: 514, question: "冰「ㄒㄧㄤ」", options: ["相", "香", "箱"], correctIndex: 2 },
        { id: 515, question: "麵「ㄊㄧㄠˊ」", options: ["條", "調", "挑"], correctIndex: 0 },
    ]},
    'L6': { id: 'L6', title: '第 6 課', questions: [
        { id: 601, question: "「ㄋㄧㄢˊ」貼", options: ["黏", "年", "連"], correctIndex: 0 },
        { id: 602, question: "「ㄇㄨˋ」頭", options: ["木", "目", "幕"], correctIndex: 0 },
        { id: 603, question: "「ㄓˋ」造", options: ["治", "製", "智"], correctIndex: 1 },
        { id: 604, question: "「ㄅㄨˋ」分", options: ["部", "步", "布"], correctIndex: 0 },
        { id: 605, question: "「ㄏㄨㄣˋ」合", options: ["混", "渾", "婚"], correctIndex: 0 },
        { id: 606, question: "折「ㄉㄨㄢˋ」", options: ["緞", "段", "斷"], correctIndex: 1 },
        { id: 607, question: "「ㄐㄧㄝˇ」釋", options: ["姐", "解", "結"], correctIndex: 1 },
        { id: 608, question: "飛「ㄐㄧ」", options: ["雞", "基", "機"], correctIndex: 2 },
        { id: 609, question: "機「ㄑㄧˋ」", options: ["器", "氣", "汽"], correctIndex: 0 },
        { id: 610, question: "「ㄌㄧㄥˋ」外", options: ["另", "令", "領"], correctIndex: 0 },
        { id: 611, question: "「ㄓˋ」療", options: ["治", "製", "志"], correctIndex: 0 },
        { id: 612, question: "樹「ㄓ」", options: ["之", "支", "枝"], correctIndex: 2 },
        { id: 613, question: "旗「ㄍㄢ」", options: ["乾", "甘", "桿"], correctIndex: 2 },
        { id: 614, question: "「ㄘㄚ」掉", options: ["擦", "插", "拆"], correctIndex: 0 },
        { id: 615, question: "「ㄒㄧㄠ」鉛筆", options: ["消", "銷", "削"], correctIndex: 2 },
    ]},
    'L7': { id: 'L7', title: '第 7 課', questions: [
        { id: 701, question: "「ㄒㄧㄢˊ」味", options: ["閒", "鹹", "嫌"], correctIndex: 1 },
        { id: 702, question: "「ㄨㄟˋ」藍", options: ["蔚", "衛", "味"], correctIndex: 0 },
        { id: 703, question: "「ㄏㄤˊ」行", options: ["航", "杭", "行"], correctIndex: 0 },
        { id: 704, question: "「ㄔㄥˊ」客", options: ["乘", "城", "成"], correctIndex: 0 },
        { id: 705, question: "雪「ㄑㄧㄠ」", options: ["敲", "撬", "橇"], correctIndex: 2 },
        { id: 706, question: "山「ㄆㄛ」", options: ["潑", "坡", "波"], correctIndex: 1 },
        { id: 707, question: "原「ㄧㄝˇ」", options: ["野", "也", "冶"], correctIndex: 0 },
        { id: 708, question: "「ㄍㄨㄣˇ」動", options: ["滾", "棍", "管"], correctIndex: 0 },
        { id: 709, question: "關「ㄅㄧˋ」", options: ["畢", "必", "閉"], correctIndex: 2 },
        { id: 710, question: "「ㄕㄣ」淺", options: ["身", "伸", "深"], correctIndex: 2 },
        { id: 711, question: "「ㄒㄧ」氣", options: ["希", "吸", "稀"], correctIndex: 1 },
        { id: 712, question: "「ㄒㄧㄣ」賞", options: ["新", "心", "欣"], correctIndex: 2 },
        { id: 713, question: "獎「ㄕㄤˇ」", options: ["賞", "上", "商"], correctIndex: 0 },
        { id: 714, question: "隱「ㄇㄢˊ」", options: ["蠻", "瞞", "饅"], correctIndex: 1 },
    ]},
    'L8': { id: 'L8', title: '第 8 課', questions: [
        { id: 801, question: "「ㄐㄧˋ」信", options: ["寄", "記", "季"], correctIndex: 0 },
        { id: 802, question: "螃「ㄒㄧㄝˋ」", options: ["謝", "卸", "蟹"], correctIndex: 2 },
        { id: 803, question: "海「ㄊㄢ」", options: ["貪", "攤", "灘"], correctIndex: 2 },
        { id: 804, question: "「ㄆㄤˊ」蟹", options: ["旁", "龐", "螃"], correctIndex: 2 },
        { id: 805, question: "「ㄉㄨㄟ」積", options: ["堆", "推", "隊"], correctIndex: 0 },
        { id: 806, question: "「ㄅㄟ」子", options: ["背", "杯", "悲"], correctIndex: 1 },
        { id: 807, question: "種「ㄌㄟˋ」", options: ["淚", "累", "類"], correctIndex: 2 },
        { id: 808, question: "「ㄐㄧㄢˇ」到", options: ["檢", "減", "撿"], correctIndex: 2 },
        { id: 809, question: "「ㄆㄧㄥˊ」子", options: ["平", "瓶", "評"], correctIndex: 1 },
        { id: 810, question: "「ㄍㄞˋ」子", options: ["蓋", "概", "鈣"], correctIndex: 0 },
        { id: 811, question: "乾「ㄐㄧㄥˋ」", options: ["靜", "淨", "競"], correctIndex: 1 },
        { id: 812, question: "「ㄓˋ」工", options: ["志", "製", "智"], correctIndex: 0 },
        { id: 813, question: "作「ㄆㄧㄣˇ」", options: ["品", "聘", "頻"], correctIndex: 0 },
        { id: 814, question: "「ㄧㄥ」該", options: ["英", "鷹", "應"], correctIndex: 2 },
        { id: 815, question: "屏「ㄇㄨˋ」", options: ["木", "目", "幕"], correctIndex: 2 },
        { id: 816, question: "貝「ㄎㄜˊ」", options: ["殼", "咳", "可"], correctIndex: 0 },
        { id: 817, question: "「ㄌㄜˋ」圾", options: ["垃", "樂", "勒"], correctIndex: 0 },
        { id: 818, question: "垃「ㄙㄜˋ」", options: ["澀", "圾", "瑟"], correctIndex: 1 },
        { id: 819, question: "保「ㄏㄨˋ」", options: ["戶", "互", "護"], correctIndex: 2 },
    ]},
    'L9': { id: 'L9', title: '第 9 課', questions: [
        { id: 901, question: "「ㄊㄧㄠ」選", options: ["挑", "條", "跳"], correctIndex: 0 },
        { id: 902, question: "「ㄐㄧㄠˋ」導", options: ["叫", "覺", "教"], correctIndex: 2 },
        { id: 903, question: "指「ㄉㄠˇ」", options: ["島", "倒", "導"], correctIndex: 2 },
        { id: 904, question: "草「ㄘㄨㄥˊ」", options: ["從", "叢", "蟲"], correctIndex: 1 },
        { id: 905, question: "大「ㄏㄢˇ」", options: ["喊", "罕", "漢"], correctIndex: 0 },
        { id: 906, question: "「ㄊㄡˊ」資", options: ["頭", "投", "透"], correctIndex: 1 },
        { id: 907, question: "「ㄐㄧˋ」續", options: ["繼", "季", "計"], correctIndex: 0 },
        { id: 908, question: "繼「ㄒㄩˋ」", options: ["序", "續", "敘"], correctIndex: 1 },
        { id: 909, question: "海「ㄢˋ」", options: ["暗", "案", "岸"], correctIndex: 2 },
        { id: 910, question: "「ㄑㄧㄢˇ」色", options: ["淺", "錢", "潛"], correctIndex: 0 },
        { id: 911, question: "「ㄐㄩㄢˇ」起", options: ["卷", "捲", "券"], correctIndex: 1 },
        { id: 912, question: "「ㄧㄢˊ」著", options: ["沿", "顏", "鹽"], correctIndex: 0 },
        { id: 913, question: "「ㄘㄞˇ」踏", options: ["彩", "採", "踩"], correctIndex: 2 },
        { id: 914, question: "「ㄗㄨㄛˋ」位", options: ["做", "座", "坐"], correctIndex: 1 },
        { id: 915, question: "一「ㄅㄢ」", options: ["搬", "班", "般"], correctIndex: 2 },
    ]},
    'L10': { id: 'L10', title: '第 10 課', questions: [
        { id: 1001, question: "結「ㄏㄨㄣ」", options: ["昏", "婚", "葷"], correctIndex: 1 },
        { id: 1002, question: "「ㄌㄧˇ」物", options: ["理", "禮", "李"], correctIndex: 1 },
        { id: 1003, question: "「ㄉㄤˋ」鞦韆", options: ["當", "蕩", "檔"], correctIndex: 1 },
        { id: 1004, question: "衣「ㄈㄨˊ」", options: ["扶", "服", "符"], correctIndex: 1 },
        { id: 1005, question: "「ㄉㄞˋ」表", options: ["帶", "代", "待"], correctIndex: 1 },
        { id: 1006, question: "幸「ㄈㄨˊ」", options: ["幅", "福", "服"], correctIndex: 1 },
        { id: 1007, question: "「ㄐㄧㄝˊ」婚", options: ["結", "潔", "節"], correctIndex: 0 },
        { id: 1008, question: "結「ㄕㄨˋ」", options: ["數", "術", "束"], correctIndex: 2 },
        { id: 1009, question: "喝「ㄐㄧㄡˇ」", options: ["酒", "九", "久"], correctIndex: 0 },
        { id: 1010, question: "「ㄐㄧㄥˋ」禮", options: ["敬", "竟", "靜"], correctIndex: 0 },
        { id: 1011, question: "跳「ㄨˇ」", options: ["午", "五", "舞"], correctIndex: 2 },
        { id: 1012, question: "「ㄒㄧˊ」慣", options: ["習", "席", "洗"], correctIndex: 0 },
        { id: 1013, question: "習「ㄙㄨˊ」", options: ["俗", "速", "宿"], correctIndex: 0 },
        { id: 1014, question: "可「ㄒㄧˊ」", options: ["惜", "昔", "熄"], correctIndex: 0 },
        { id: 1015, question: "「ㄏㄨˋ」相", options: ["互", "戶", "護"], correctIndex: 0 },
    ]},
    'L11': { id: 'L11', title: '第 11 課', questions: [
        { id: 1101, question: "「ㄔㄨˊ」非", options: ["廚", "除", "儲"], correctIndex: 1 },
        { id: 1102, question: "大「ㄕㄣˇ」", options: ["審", "沈", "嬸"], correctIndex: 2 },
        { id: 1103, question: "抽「ㄧㄢ」", options: ["菸", "煙", "淹"], correctIndex: 1 },
        { id: 1104, question: "鞭「ㄆㄠˋ」", options: ["泡", "炮", "跑"], correctIndex: 1 },
        { id: 1105, question: "「ㄈㄨˋ」近", options: ["副", "附", "付"], correctIndex: 1 },
        { id: 1106, question: "商「ㄉㄧㄢˋ」", options: ["殿", "店", "墊"], correctIndex: 1 },
        { id: 1107, question: "休「ㄒㄧˊ」", options: ["息", "席", "習"], correctIndex: 0 },
        { id: 1108, question: "「ㄒㄧㄡ」理", options: ["休", "修", "羞"], correctIndex: 1 },
        { id: 1109, question: "工「ㄔㄤˇ」", options: ["場", "廠", "長"], correctIndex: 1 },
        { id: 1110, question: "「ㄏㄨㄞˋ」掉", options: ["壞", "懷", "畫"], correctIndex: 0 },
        { id: 1111, question: "檢「ㄔㄚˊ」", options: ["茶", "察", "查"], correctIndex: 1 },
        { id: 1112, question: "「ㄅㄞˇ」放", options: ["擺", "百", "柏"], correctIndex: 0 },
        { id: 1113, question: "「ㄒㄧㄥˋ」福", options: ["性", "姓", "幸"], correctIndex: 2 },
        { id: 1114, question: "「ㄌㄧㄥˊ」食", options: ["零", "鈴", "靈"], correctIndex: 0 },
    ]},
    'L12': { id: 'L12', title: '第 12 課', questions: [
        { id: 1201, question: "「ㄊㄨㄢˊ」隊", options: ["團", "傳", "糰"], correctIndex: 0 },
        { id: 1202, question: "「ㄔㄨㄤ」戶", options: ["創", "窗", "瘡"], correctIndex: 1 },
        { id: 1203, question: "「ㄕㄥˋ」下", options: ["剩", "盛", "聖"], correctIndex: 0 },
        { id: 1204, question: "沈「ㄇㄛˋ」", options: ["末", "墨", "默"], correctIndex: 2 },
        { id: 1205, question: "「ㄘㄨㄥ」忙", options: ["聰", "蔥", "匆"], correctIndex: 2 },
        { id: 1206, question: "電「ㄕˋ」", options: ["視", "市", "式"], correctIndex: 0 },
        { id: 1207, question: "叔「ㄕㄨˊ」", options: ["熟", "淑", "叔"], correctIndex: 2 },
        { id: 1208, question: "「ㄉㄡˋ」趣", options: ["逗", "豆", "痘"], correctIndex: 0 },
        { id: 1209, question: "食「ㄊㄤˊ」", options: ["糖", "堂", "塘"], correctIndex: 1 },
        { id: 1210, question: "娃「ㄨㄚˊ」", options: ["蛙", "娃", "哇"], correctIndex: 1 },
        { id: 1211, question: "「ㄧㄚ」力", options: ["鴨", "押", "壓"], correctIndex: 2 },
        { id: 1212, question: "金「ㄑㄧㄢˊ」", options: ["錢", "前", "潛"], correctIndex: 0 },
        { id: 1213, question: "「ㄊㄡˋ」明", options: ["透", "偷", "投"], correctIndex: 0 },
        { id: 1214, question: "「ㄨㄛˋ」手", options: ["握", "沃", "臥"], correctIndex: 0 },
    ]}
};

interface GameState {
  status: GameStatus;
  score: number;
  bonusScore: number;
  bestScore: number;
  speed: number;
  timeRemaining: number;
  carPosition: { x: number; z: number };
  chunks: TrackChunkData[];
  playerChunkIndex: number;
  playerProgress: number;
  selectedLessonIds: string[];
  activeQuestions: QuizQuestion[];
  currentQuestion: QuizQuestion;
  lastSpokenQuestionId: number | null;
  boostTimer: number;
  penaltyTimer: number;
  feedbackMessage: string | null;
  competitors: Competitor[];

  toggleLesson: (lessonId: string) => void;
  startGame: () => void;
  resetGame: () => void;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  setCarPosition: (x: number, z: number, chunkIndex: number, progressInChunk: number) => void;
  generateInitialTrack: () => void;
  answerQuestion: (isCorrect: boolean) => void;
  collectItem: (chunkId: number, boxId: string) => void;
  collectCoin: (chunkId: number, obsId: string) => void;
  destroyObstacle: (chunkId: number, obsId: string) => void;
  tickTimers: () => void;
  updateCompetitors: (dt: number) => void;
}

let nextChunkId = 0;

const getRandomQuestion = (): QuizQuestion => {
    const activeQuestions = useGameStore.getState().activeQuestions;
    // Fallback if pool is empty
    if (activeQuestions.length === 0) return LESSON_CATALOG['L1'].questions[0]; 
    return activeQuestions[Math.floor(Math.random() * activeQuestions.length)];
};

const checkCollision = (points: Vector3[], history: TrackChunkData[]): boolean => {
    if (history.length < 5) return false;
    const endIdx = history.length - 2;
    const startIdx = Math.max(0, history.length - 50);
    const SAFE_DISTANCE = TRACK_WIDTH * 2; 

    for (let i = startIdx; i < endIdx; i++) {
        const chunk = history[i];
        for (const p1 of points) {
            for (const p2 of chunk.controlPoints) {
                if (p1.distanceTo(p2) < SAFE_DISTANCE) return true;
            }
        }
    }
    return false;
};

const createChunk = (prevChunk: TrackChunkData | null, existingChunks: TrackChunkData[]): TrackChunkData => {
  const id = nextChunkId++;
  const isQuizChunk = id > 4 && id % 10 === 0;
  const isPreQuizChunk = (id + 1) > 4 && (id + 1) % 10 === 0;

  let type = ChunkType.STRAIGHT;
  let points: Vector3[] = [];
  let currentPos = new Vector3(0,0,0);
  let currentAngle = 0;
  let startPoint = new Vector3(0,0,0);
  let startAngle = 0;
  let angleDeltaPerSeg = 0;
  const segments = 5;
  const segmentLength = CHUNK_LENGTH / segments;

  if (prevChunk) {
      startPoint = prevChunk.endPoint.clone();
      startAngle = prevChunk.endAngle;
  }

  const generateGeometry = (testType: ChunkType) => {
      const pts: Vector3[] = [startPoint];
      let angle = startAngle;
      let pos = startPoint.clone();
      let dAngle = 0;

      if (testType === ChunkType.LEFT) dAngle = 0.15;
      if (testType === ChunkType.RIGHT) dAngle = -0.15;
      if (testType === ChunkType.U_TURN_LEFT) dAngle = 0.5;
      if (testType === ChunkType.U_TURN_RIGHT) dAngle = -0.5;

      for (let i = 1; i <= segments; i++) {
          angle += dAngle;
          const dx = Math.sin(angle) * segmentLength;
          const dz = Math.cos(angle) * segmentLength;
          pos = new Vector3(pos.x + dx, 0, pos.z + dz);
          pts.push(pos.clone());
      }
      return { pts, finalPos: pos, finalAngle: angle, dAngle };
  };

  let candidates: ChunkType[] = [];
  if (!prevChunk || isQuizChunk || isPreQuizChunk) {
      candidates = [ChunkType.STRAIGHT];
  } else {
      let lastUTurnId = -100;
      for (let i = existingChunks.length - 1; i >= 0; i--) {
          if (existingChunks[i].type === ChunkType.U_TURN_LEFT || existingChunks[i].type === ChunkType.U_TURN_RIGHT) {
              lastUTurnId = existingChunks[i].id;
              break;
          }
      }
      const canUTurn = (id - lastUTurnId) > 8;
      const roll = Math.random();
      let preferred: ChunkType = ChunkType.STRAIGHT;
      if (canUTurn && roll < 0.1) preferred = ChunkType.U_TURN_LEFT;
      else if (canUTurn && roll < 0.2) preferred = ChunkType.U_TURN_RIGHT;
      else if (roll < 0.5) preferred = ChunkType.LEFT;
      else if (roll < 0.8) preferred = ChunkType.RIGHT;
      else preferred = ChunkType.STRAIGHT;

      candidates.push(preferred);
      if (preferred !== ChunkType.STRAIGHT) candidates.push(ChunkType.STRAIGHT);
  }

  let success = false;
  for (const candidate of candidates) {
      const result = generateGeometry(candidate);
      if (!checkCollision(result.pts, existingChunks)) {
          type = candidate;
          points = result.pts;
          currentPos = result.finalPos;
          currentAngle = result.finalAngle;
          angleDeltaPerSeg = result.dAngle;
          success = true;
          break;
      }
  }

  if (!success) {
      const result = generateGeometry(ChunkType.STRAIGHT);
      type = ChunkType.STRAIGHT;
      points = result.pts;
      currentPos = result.finalPos;
      currentAngle = result.finalAngle;
  }

  let ghostStart: Vector3;
  if (prevChunk && prevChunk.controlPoints.length >= 2) {
      ghostStart = prevChunk.controlPoints[prevChunk.controlPoints.length - 2].clone();
  } else {
      const dx = Math.sin(startAngle) * segmentLength;
      const dz = Math.cos(startAngle) * segmentLength;
      ghostStart = startPoint.clone().sub(new Vector3(dx, 0, dz));
  }
  const ghostEndAngle = currentAngle + angleDeltaPerSeg;
  const gdx = Math.sin(ghostEndAngle) * segmentLength;
  const gdz = Math.cos(ghostEndAngle) * segmentLength;
  const ghostEnd = currentPos.clone().add(new Vector3(gdx, 0, gdz));

  const renderPoints = [ghostStart, ...points, ghostEnd];
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const items: ItemBoxData[] = [];
  const obstacles: ObstacleData[] = [];
  let assignedQuestion: QuizQuestion | undefined;

  if (isQuizChunk) {
      assignedQuestion = getRandomQuestion();
      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex];
      const curveForTangent = new CatmullRomCurve3(points, false);
      const tangent = curveForTangent.getTangentAt(0.5).normalize();
      const up = new Vector3(0, 1, 0);
      const side = new Vector3().crossVectors(up, tangent).normalize();
      const spacing = TRACK_WIDTH / 3;

      items.push({
          id: `${id}-opt-0`,
          position: midPoint.clone().sub(side.clone().multiplyScalar(spacing)),
          text: assignedQuestion.options[0],
          isCorrect: assignedQuestion.correctIndex === 0,
          isCollected: false
      });
      items.push({
          id: `${id}-opt-1`,
          position: midPoint.clone(),
          text: assignedQuestion.options[1],
          isCorrect: assignedQuestion.correctIndex === 1,
          isCollected: false
      });
      items.push({
          id: `${id}-opt-2`,
          position: midPoint.clone().add(side.clone().multiplyScalar(spacing)),
          text: assignedQuestion.options[2],
          isCorrect: assignedQuestion.correctIndex === 2,
          isCollected: false
      });
  } else {
      const rand = Math.random();
      const getPosAndRot = (t: number, offset: number) => {
          const pt = curve.getPointAt(t);
          const tan = curve.getTangentAt(t).normalize();
          const up = new Vector3(0, 1, 0);
          const s = new Vector3().crossVectors(up, tan).normalize();
          const angle = Math.atan2(tan.x, tan.z);
          return { pos: pt.clone().add(s.multiplyScalar(offset)), rot: angle, tangent: tan };
      };

      if (rand < 0.15 && type === ChunkType.STRAIGHT) {
          const { pos, rot, tangent } = getPosAndRot(0.5, 0);
          obstacles.push({ id: `${id}-ramp`, type: ObstacleType.RAMP, position: pos, rotation: rot });
          for(let i=0; i<3; i++) {
              const distForward = 4 + (i * 2.5);
              const height = 3.5 + Math.sin(i * 1.5) * 1.5;
              const coinPos = pos.clone().add(tangent.clone().multiplyScalar(distForward));
              coinPos.y += height;
              obstacles.push({ id: `${id}-ramp-coin-${i}`, type: ObstacleType.COIN, position: coinPos, rotation: rot, isCollected: false });
          }
      }
      else if (rand < 0.75) {
           const pattern = Math.random();
           for(let k=0; k<5; k++) {
               const t = 0.3 + (k * 0.1);
               const offset = pattern > 0.5 ? 0 : Math.sin(k) * 3; 
               const { pos, rot } = getPosAndRot(t, offset);
               pos.y = 0.6;
               obstacles.push({ id: `${id}-coin-${k}`, type: ObstacleType.COIN, position: pos, rotation: rot, isCollected: false });
           }
      }
  }

  return { id, type, startPoint, endPoint: currentPos, startAngle, endAngle: currentAngle, controlPoints: points, renderPoints, items, obstacles, assignedQuestion };
};

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.IDLE,
  score: 0,
  bonusScore: 0,
  bestScore: parseInt(localStorage.getItem('polykart-best') || '0', 10),
  speed: 0,
  timeRemaining: 180,
  carPosition: { x: 0, z: 0 },
  chunks: [],
  playerChunkIndex: 0,
  playerProgress: 0,
  selectedLessonIds: JSON.parse(localStorage.getItem('polykart-lessons') || '["L1"]'),
  activeQuestions: [], // Will be populated in generateInitialTrack/startGame
  currentQuestion: LESSON_CATALOG['L1'].questions[0],
  lastSpokenQuestionId: null,
  boostTimer: 0,
  penaltyTimer: 0,
  feedbackMessage: null,
  competitors: [],

  generateInitialTrack: () => {
    const { selectedLessonIds } = get();
    // Pre-populate pool based on selection for seamless start
    let pool: QuizQuestion[] = [];
    selectedLessonIds.forEach(id => { if (LESSON_CATALOG[id]) pool = [...pool, ...LESSON_CATALOG[id].questions]; });
    if (pool.length === 0) pool = LESSON_CATALOG['L1'].questions;
    
    nextChunkId = 0;
    const chunks: TrackChunkData[] = [];
    let prev: TrackChunkData | null = null;
    
    // Set active pool BEFORE loop
    set({ activeQuestions: pool, currentQuestion: pool[0] });

    const first = createChunk(null, []);
    first.type = ChunkType.STRAIGHT; first.endPoint = new Vector3(0, 0, CHUNK_LENGTH); first.controlPoints = [new Vector3(0,0,0), new Vector3(0,0, CHUNK_LENGTH)]; chunks.push(first);
    prev = first;
    for (let i = 0; i < CHUNKS_TO_RENDER; i++) {
      const next = createChunk(prev, chunks);
      if (prev?.renderPoints && next.controlPoints.length > 1) prev.renderPoints[prev.renderPoints.length - 1] = next.controlPoints[1].clone();
      chunks.push(next);
      prev = next;
    }
    set({ chunks, playerChunkIndex: 0, playerProgress: 0, boostTimer: 0, penaltyTimer: 0, bonusScore: 0, competitors: [], lastSpokenQuestionId: null });
  },

  toggleLesson: (lessonId: string) => {
      set(state => {
          const current = state.selectedLessonIds;
          let newSelection = current;
          if (current.includes(lessonId)) {
              if (current.length > 1) newSelection = current.filter(id => id !== lessonId);
          } else { newSelection = [...current, lessonId]; }
          localStorage.setItem('polykart-lessons', JSON.stringify(newSelection));
          return { selectedLessonIds: newSelection };
      });
  },

  startGame: () => {
    const { selectedLessonIds } = get();
    let pool: QuizQuestion[] = [];
    selectedLessonIds.forEach(id => { if (LESSON_CATALOG[id]) pool = [...pool, ...LESSON_CATALOG[id].questions]; });
    if (pool.length === 0) pool = LESSON_CATALOG['L1'].questions;
    
    set({ activeQuestions: pool, timeRemaining: 180, lastSpokenQuestionId: null, currentQuestion: pool[0] });
    get().generateInitialTrack();
    
    soundManager.resume();
    soundManager.startMusic();
    soundManager.startEngine();
    soundManager.playSfx('boost');
    set({ status: GameStatus.RACING, score: 0, bonusScore: 0, speed: 0, competitors: [] });
  },

  resetGame: () => {
    soundManager.stopEngine();
    soundManager.startMusic();
    set({ status: GameStatus.IDLE, score: 0, bonusScore: 0, speed: 0, carPosition: { x: 0, z: 0 }, playerChunkIndex: 0, playerProgress: 0, competitors: [], lastSpokenQuestionId: null });
  },

  togglePause: () => {
      set(state => {
          if (state.status === GameStatus.RACING) { soundManager.stopEngine(); soundManager.stopMusic(); return { status: GameStatus.PAUSED }; }
          else if (state.status === GameStatus.PAUSED) { soundManager.startEngine(); soundManager.startMusic(); return { status: GameStatus.RACING }; }
          return {};
      });
  },

  setSpeed: (speed) => set({ speed }),
  
  tickTimers: () => {
      const { status, timeRemaining, boostTimer, penaltyTimer } = get();
      if (status !== GameStatus.RACING) return;
      
      const newTime = Math.max(0, timeRemaining - 1/60);
      if (newTime <= 0) {
        set({ status: GameStatus.FINISHED, timeRemaining: 0 });
        soundManager.stopEngine();
        return;
      }
      
      set({ 
        timeRemaining: newTime,
        boostTimer: Math.max(0, boostTimer - 1),
        penaltyTimer: Math.max(0, penaltyTimer - 1)
      });
  },

  answerQuestion: (isCorrect) => {
      if (isCorrect) {
          soundManager.playSfx('correct');
          soundManager.playSfx('boost');
          set({ boostTimer: EFFECT_DURATION, penaltyTimer: 0, feedbackMessage: "答對了！氮氣噴射！" });
      } else {
          soundManager.playSfx('wrong');
          set({ boostTimer: 0, penaltyTimer: EFFECT_DURATION, feedbackMessage: "答錯了！減速中..." });
      }
      setTimeout(() => set({ feedbackMessage: null }), 2000);
  },

  collectItem: (chunkId, boxId) => {
      set(state => {
          const newChunks = state.chunks.map(c => {
              if (c.id !== chunkId) return c;
              return { ...c, items: c.items.map(i => i.id === boxId ? { ...i, isCollected: true } : i) };
          });
          return { chunks: newChunks };
      });
  },

  collectCoin: (chunkId, obsId) => {
      set(state => {
          const chunk = state.chunks.find(c => c.id === chunkId);
          if (!chunk) return {};
          const obs = chunk.obstacles.find(o => o.id === obsId);
          if (!obs || obs.isCollected) return {};
          soundManager.playSfx('coin');
          return { chunks: state.chunks.map(c => c.id === chunkId ? { ...c, obstacles: c.obstacles.map(o => o.id === obsId ? { ...o, isCollected: true } : o) } : c), bonusScore: state.bonusScore + 50 };
      });
  },
  
  destroyObstacle: (chunkId, obsId) => {
      set(state => ({ chunks: state.chunks.map(c => c.id === chunkId ? { ...c, obstacles: c.obstacles.map(o => o.id === obsId ? { ...o, isCollected: true } : o) } : c) }));
  },
  
  updateCompetitors: (dt: number) => {
      set(state => {
          if (state.status !== GameStatus.RACING) return {};
          let newCompetitors = [...state.competitors];
          newCompetitors = newCompetitors.filter(c => c.chunkId >= state.playerChunkIndex - 1);
          const aheadCount = newCompetitors.filter(c => c.chunkId > state.playerChunkIndex).length;
          if (aheadCount < 3) {
              const id = Math.random().toString(36).substr(2, 5);
              newCompetitors.push({ id: `bot-${id}`, chunkId: state.playerChunkIndex + 4, progress: 0, laneOffset: (Math.random() * TRACK_WIDTH) - (TRACK_WIDTH/2), speed: 0.35 + (Math.random() * 0.20), color: '#' + Math.floor(Math.random()*16777215).toString(16), modelOffset: Math.floor(Math.random() * 3) });
          }
          newCompetitors = newCompetitors.map(c => {
              let nextProgress = c.progress + (c.speed * dt * 30 / CHUNK_LENGTH); 
              let nextChunkId = c.chunkId;
              if (nextProgress >= 1) { nextProgress -= 1; nextChunkId += 1; }
              return { ...c, progress: nextProgress, chunkId: nextChunkId };
          });
          return { competitors: newCompetitors };
      });
  },

  setCarPosition: (x, z, chunkIndex, progressInChunk) => {
    const { chunks, playerChunkIndex, bestScore, bonusScore, status, lastSpokenQuestionId } = get();
    const distScore = Math.floor((chunkIndex * CHUNK_LENGTH) + (progressInChunk * CHUNK_LENGTH));
    const totalScore = distScore + bonusScore;
    if (totalScore > bestScore) localStorage.setItem('polykart-best', totalScore.toString());

    let newChunks = chunks;
    let newPlayerChunkIndex = playerChunkIndex;
    if (chunkIndex > playerChunkIndex) {
        newPlayerChunkIndex = chunkIndex;
        const lastChunk = chunks[chunks.length - 1];
        const next = createChunk(lastChunk, chunks);
        const updatedLastChunk = { ...lastChunk, renderPoints: [...(lastChunk.renderPoints || [])] };
        if (updatedLastChunk.renderPoints.length > 0 && next.controlPoints.length > 1) updatedLastChunk.renderPoints[updatedLastChunk.renderPoints.length - 1] = next.controlPoints[1].clone();
        newChunks = [...chunks.slice(0, -1), updatedLastChunk, next];
    }

    const upcomingQuizzes = newChunks.filter(c => c.id >= chunkIndex && c.assignedQuestion && c.items.some(i => !i.isCollected));
    let nextQuizChunk = upcomingQuizzes[0];
    
    if (nextQuizChunk && nextQuizChunk.id === chunkIndex && progressInChunk > 0.6) {
        nextQuizChunk = upcomingQuizzes[1];
    }
    
    const nextQuestion = nextQuizChunk?.assignedQuestion || get().currentQuestion;
    
    if (nextQuestion && nextQuestion.id !== lastSpokenQuestionId && status === GameStatus.RACING) {
        // Construct the full word for auto-speech as well
        const correctAnswer = nextQuestion.options[nextQuestion.correctIndex];
        const wordToSpeak = nextQuestion.question.replace(/「[^」]+」/g, correctAnswer).replace(/\([^\)]+\)/g, '');
        soundManager.speak(wordToSpeak);
        set({ lastSpokenQuestionId: nextQuestion.id });
    }

    set({ carPosition: { x, z }, chunks: newChunks, playerChunkIndex: newPlayerChunkIndex, playerProgress: progressInChunk, score: totalScore, bestScore: Math.max(bestScore, totalScore), currentQuestion: nextQuestion });
  },
}));
