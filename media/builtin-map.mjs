// builtin-map.js —— 内置库函数中文别名表
//
// 引擎按「最长点号链优先」匹配，因此同时提供前缀（如 console）与完整链（如 console.log）。
// 用户自定义别名优先级高于内置（见 main.js 的 mergedMaps）。
//
// 写法：每个「根」为 [英文根, 中文根, 成员表]，成员表每行 `英文相对路径:中文相对后缀`。
//   - 中文后缀的段数必须与英文路径一致，构建时会自动补齐中间前缀：
//       path.join:路径.连接  ⇒  path:路径 + path.join:路径.连接
//   - 英文根为空串时表示「裸名」条目，此时 `en:cn` 的两侧都是完整名称。
//   - 第 4 项为 true 时不生成根条目本身（根名已被其他含义占用时使用）。
// 别名只允许中文、数字、下划线、点号（与 .cnmap 校验规则一致）。

/* eslint-disable */
function parseSpec(rootEn, rootCn, spec, skipRoot) {
  const out = [];
  const push = (en, cn) => out.push([en, cn]);
  if (rootEn && !skipRoot) push(rootEn, rootCn);
  for (const raw of String(spec || '').split('\n')) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const en = line.slice(0, idx).trim();
    const cn = line.slice(idx + 1).trim();
    if (!en || !cn) continue;
    const eps = en.split('.');
    const cps = cn.split('.');
    if (rootEn) {
      if (eps.length === cps.length && eps.length > 1) {
        for (let k = 1; k < eps.length; k++) {
          push(rootEn + '.' + eps.slice(0, k).join('.'), rootCn + '.' + cps.slice(0, k).join('.'));
        }
      }
      push(rootEn + '.' + en, rootCn + '.' + cn);
    } else {
      push(en, cn);
    }
  }
  return out;
}

function buildItems(roots) {
  const byEn = new Map();
  for (const r of roots) {
    for (const [en, cn] of parseSpec(r[0] || '', r[1] || '', r[2] || '', r[3])) {
      if (!byEn.has(en)) byEn.set(en, cn);
    }
  }
  return [...byEn.entries()];
}

// ============================================================
// JavaScript / TypeScript
// ============================================================

const JS_CORE = [
  ['console', '控制台', `
    log:日志
    error:错误
    warn:警告
    info:信息
    debug:调试
    table:表格
    trace:追踪
    dir:查看对象
    group:分组
    groupEnd:结束分组
    time:计时开始
    timeEnd:计时结束
    assert:断言
    count:计数
    clear:清空控制台
  `],
  ['JSON', 'JSON', `
    stringify:序列化
    parse:解析
  `],
  ['Math', '数学', `
    random:随机
    floor:向下取整
    ceil:向上取整
    round:四舍五入
    max:最大值
    min:最小值
    abs:绝对值
    pow:乘方
    sqrt:平方根
    PI:圆周率
    E:自然常数
    trunc:截断
    sign:符号
    hypot:斜边
    log:对数
    log2:二对数
    log10:十对数
    exp:指数
    sin:正弦
    cos:余弦
    tan:正切
    atan2:反正切二
    cbrt:立方根
    imul:整数乘
    clz32:前导零
  `],
  ['Array', '数组', `
    isArray:是数组
    from:从
    of:由
    prototype:原型
  `],
  ['Object', '对象', `
    keys:键
    values:值
    entries:条目
    assign:分配
    freeze:冻结
    create:创建
    defineProperty:定义属性
    getPrototypeOf:获取原型
    setPrototypeOf:设置原型
    hasOwn:有自有属性
    seal:密封
    preventExtensions:阻止扩展
    fromEntries:从条目
  `],
  ['String', '字符串类型', `
    fromCharCode:从字符编码
    fromCodePoint:从码点
    raw:原始
  `],
  ['Number', '数字', `
    isInteger:是整数
    isNaN:是空值
    isFinite:是有限数
    isSafeInteger:是安全整数
    parseFloat:解析浮点数
    parseInt:解析整数
    MAX_SAFE_INTEGER:最大安全整数
    EPSILON:最小间隔
  `],
  ['Date', '日期', `
    now:现在
    parse:解析
    UTC:世界时间
  `],
  ['Promise', '承诺', `
    all:全部
    race:竞速
    resolve:完成
    reject:拒绝
    allSettled:全部完成
    any:任意一个
  `],
  ['', '', `
    parseInt:解析整数
    parseFloat:解析浮点数
    isNaN:是空值
    isFinite:是有限数
    encodeURIComponent:编码地址组件
    decodeURIComponent:解码地址组件
    encodeURI:编码地址
    decodeURI:解码地址
    structuredClone:结构化克隆
    queueMicrotask:微任务入队
    setTimeout:设置超时
    clearTimeout:清除超时
    setInterval:设置间隔
    clearInterval:清除间隔
    requestAnimationFrame:请求动画帧
    cancelAnimationFrame:取消动画帧
    fetch:请求
  `],
];

const JS_METHODS = [
  ['', '', `
    map:映射
    filter:过滤
    reduce:归约
    forEach:遍历每个
    find:查找
    findIndex:查找索引
    some:有一些
    every:每个满足
    sort:排序
    reverse:反转
    slice:切片
    splice:拼接
    push:推入
    pop:弹出
    shift:移除首项
    unshift:添加首项
    join:连接
    concat:合并
    indexOf:索引位置
    lastIndexOf:最后索引位置
    includes:包含
    flat:扁平
    flatMap:映射扁平
    at:取指定项
    fill:填充
    keys:键
    values:值
    entries:条目
    has:有
    get:获取
    set:设置
    add:添加
    delete:删除
    clear:清空
    size:大小
    length:长度
    next:下一个
    done:完成
    toUpperCase:转大写
    toLowerCase:转小写
    trim:修剪空白
    trimStart:修剪前空白
    trimEnd:修剪后空白
    split:分割
    replace:替换
    replaceAll:全部替换
    startsWith:以开始
    endsWith:以结束
    padStart:前填充
    padEnd:后填充
    charAt:取字符
    charCodeAt:取字符编码
    substring:子串
    substr:子串偏移
    repeat:重复
    match:匹配字符
    search:搜索字符
    toString:转文本
    localeCompare:本地比较
    normalize:规范文本
  `],
];

const JS_DOM = [
  ['document', '文档', `
    getElementById:按标识获取元素
    querySelector:查询选择器
    querySelectorAll:查询所有选择器
    createElement:创建元素
    createTextNode:创建文本节点
    createDocumentFragment:创建文档片段
    addEventListener:添加事件监听
    removeEventListener:移除事件监听
    body:主体
    head:头部
    title:标题
    cookie:饼干
    readyState:就绪状态
    getElementsByClassName:按类名获取元素
    getElementsByTagName:按标签获取元素
    write:写入
  `],
  ['window', '窗口', `
    addEventListener:添加事件监听
    removeEventListener:移除事件监听
    setTimeout:设置超时
    setInterval:设置间隔
    clearTimeout:清除超时
    clearInterval:清除间隔
    localStorage:本地存储
    sessionStorage:会话存储
    location:位置
    history:历史
    navigator:导航器
    alert:提醒
    confirm:确认
    prompt:输入提示
    open:打开窗口
    close:关闭窗口
    innerWidth:内部宽度
    innerHeight:内部高度
    scrollTo:滚动到
    scrollY:滚动纵坐标
    getComputedStyle:获取计算样式
    matchMedia:匹配媒体
    devicePixelRatio:设备像素比
    requestAnimationFrame:请求动画帧
    cancelAnimationFrame:取消动画帧
  `],
  ['localStorage', '本地存储', `
    getItem:获取项
    setItem:设置项
    removeItem:移除项
    clear:清空
    key:键名
  `],
  ['sessionStorage', '会话存储', `
    getItem:获取项
    setItem:设置项
    removeItem:移除项
    clear:清空
  `],
  ['location', '位置', `
    href:地址
    reload:重载
    assign:分配地址
    replace:替换地址
    pathname:路径名
    search:查询
    hash:锚点
    origin:来源
    host:主机
    protocol:协议
  `],
  ['history', '历史', `
    pushState:推送状态
    replaceState:替换状态
    back:后退
    forward:前进
    go:前往
  `],
  ['navigator', '导航器', `
    userAgent:用户代理
    clipboard:剪贴板
    geolocation:地理位置
    language:语言
    languages:语言列表
    sendBeacon:发送信标
  `],
  ['navigator.clipboard', '导航器.剪贴板', `
    writeText:写文本
    readText:读文本
  `],
  ['classList', '类名列表', `
    add:添加
    remove:移除
    toggle:切换
    contains:包含类
    replace:替换类
  `],
  ['Element', '元素', `
    querySelector:查询选择器
    querySelectorAll:查询所有选择器
    appendChild:追加子节点
    removeChild:移除子节点
    setAttribute:设置属性
    getAttribute:获取属性
    classList:类名列表
    innerHTML:内部标记
    textContent:文本内容
    style:样式
    dataset:数据集合
    contains:包含
    closest:最近祖先
    matches:匹配选择器
    remove:移除元素
    cloneNode:克隆节点
    getBoundingClientRect:获取边界矩形
  `],
  ['HTMLElement', '超文本元素', `
    style:样式
    dataset:数据集合
    offsetWidth:偏移宽度
    offsetHeight:偏移高度
    innerText:内部文本
  `],
  ['Event', '事件', `
    target:目标
    currentTarget:当前目标
    preventDefault:阻止默认
    stopPropagation:阻止传播
    type:类型名
    key:键值
    code:编码
    clientX:客户端横坐标
    clientY:客户端纵坐标
    altKey:替代键
    ctrlKey:控制键
    shiftKey:上档键
  `],
  ['FormData', '表单数据', `
    append:追加
    get:获取
    set:设置
    delete:删除
    has:有
    entries:条目
    forEach:遍历每个
  `],
  ['URL', '地址对象', `
    searchParams:查询参数
    pathname:路径名
    href:地址
    host:主机
  `],
  ['URLSearchParams', '地址参数', `
    get:获取
    set:设置
    append:追加
    has:有
    toString:转文本
  `],
  ['File', '文件', `
    name:名称
    size:大小
    type:类型
    lastModified:最后修改
  `],
  ['FileReader', '文件读取器', `
    readAsText:读取为文本
    readAsDataURL:读取为地址
    onload:加载时
  `],
  ['Blob', '二进制块', `
    text:文本
    arrayBuffer:数组缓冲
    size:大小
    type:类型
  `],
  ['', '', `
    getElementById:按标识获取元素
    querySelector:查询选择器
    querySelectorAll:查询所有选择器
    createElement:创建元素
    createTextNode:创建文本节点
    addEventListener:添加事件监听
    removeEventListener:移除事件监听
    dispatchEvent:派发事件
    appendChild:追加子节点
    insertBefore:插入前
    removeChild:移除子节点
    replaceChild:替换子节点
    cloneNode:克隆节点
    setAttribute:设置属性
    getAttribute:获取属性
    removeAttribute:移除属性
    getBoundingClientRect:获取边界矩形
    scrollIntoView:滚动到可视
    preventDefault:阻止默认
    stopPropagation:阻止传播
    stopImmediatePropagation:阻止立即传播
    innerHTML:内部标记
    textContent:文本内容
    innerText:内部文本
    dataset:数据集合
    classList:类名列表
    focus:聚焦
    blur:失焦
    click:点击
    submit:提交
    reset:重置
    alert:提醒
    confirm:确认
    prompt:输入提示
  `],
];

const JS_NODE = [
  ['fs', '文件系统', `
    readFile:读取文件
    readFileSync:同步读取文件
    writeFile:写入文件
    writeFileSync:同步写入文件
    appendFile:追加文件
    existsSync:存在
    mkdir:创建目录
    mkdirSync:同步创建目录
    readdir:读取目录
    readdirSync:同步读取目录
    stat:获取状态
    statSync:同步获取状态
    unlink:删除文件
    unlinkSync:同步删除文件
    rmdir:删除目录
    copyFile:复制文件
    rename:重命名
    createReadStream:创建读取流
    createWriteStream:创建写入流
    promises:承诺接口
  `],
  ['fs.promises', '文件系统.承诺接口', `
    readFile:读取文件
    writeFile:写入文件
    readdir:读取目录
    mkdir:创建目录
    stat:获取状态
  `],
  ['path', '路径', `
    join:连接
    resolve:解析
    dirname:目录名
    basename:文件名
    extname:扩展名
    sep:分隔符
    parse:解析路径
    format:格式化路径
    isAbsolute:是绝对路径
    relative:相对路径
    normalize:规范化
  `],
  ['os', '操作系统模块', `
    platform:平台
    cpus:处理器
    homedir:用户主目录
    tmpdir:临时目录
    hostname:主机名
    EOL:行结束符
    arch:架构
    totalmem:总内存
    freemem:空闲内存
    uptime:运行时长
    userInfo:用户信息
  `],
  ['process', '进程', `
    argv:参数
    env:环境变量
    exit:退出
    cwd:当前目录
    platform:平台
    pid:进程号
    version:版本
    versions:版本表
    nextTick:下一轮
    stdout:标准输出
    stderr:标准错误
    stdin:标准输入
    on:监听
    kill:终止
  `],
  ['Buffer', '缓冲', `
    from:从
    alloc:分配
    isBuffer:是缓冲
    concat:合并
    byteLength:字节长度
  `],
  ['http', '超文本协议', `
    createServer:创建服务
    request:请求
    get:获取
    Server:服务
    STATUS_CODES:状态码表
  `],
  ['https', '安全超文本协议', `
    createServer:创建服务
    request:请求
    get:获取
  `],
  ['url', '地址模块', `
    parse:解析
    format:格式化
    resolve:合并地址
    URL:地址对象
  `],
  ['crypto', '加密', `
    randomUUID:随机标识
    randomBytes:随机字节
    createHash:创建摘要
    createHmac:创建签名
    createCipheriv:创建加密器
    createDecipheriv:创建解密器
    pbkdf2Sync:派生密钥
  `],
  ['events', '事件模块', `
    EventEmitter:事件发射器
    on:监听
    emit:派发
    once:一次监听
    off:取消监听
  `],
  ['child_process', '子进程', `
    exec:执行命令
    execSync:同步执行命令
    spawn:启动进程
    fork:派生进程
  `],
  ['util', '工具', `
    promisify:承诺化
    inspect:查看对象
    format:格式化文本
    inherits:继承
  `],
  ['stream', '流', `
    Readable:可读流
    Writable:可写流
    Transform:转换流
    pipeline:管线
    PassThrough:直通流
  `],
  ['zlib', '压缩', `
    gzipSync:同步压缩
    gunzipSync:同步解压
    deflateSync:同步紧缩
  `],
  ['express', '网页框架', `
    json:解析结构
    static:静态资源
    Router:路由器
    Request:请求对象
    Response:响应对象
  `],
  ['dotenv', '环境文件', `
    config:读取配置
  `],
  ['module', '模块', `
    exports:导出
  `],
  ['', '', `
    __dirname:当前文件目录
    __filename:当前文件名
  `],
];

const JS_WEB = [
  ['React', '组件库', `
    createElement:创建元素
    Fragment:片段
    Component:组件
    PureComponent:纯组件
    memo:记忆
    StrictMode:严格模式
    Suspense:悬念
    createContext:创建上下文
    forwardRef:转发引用
    lazy:懒加载
    Children:子节点集合
  `],
  ['Vue', '渐进框架', `
    createApp:创建应用
    ref:引用
    reactive:响应式
    computed:计算属性
    watch:监听
    nextTick:下一帧
  `],
  ['THREE', '三维引擎', `
    Scene:场景
    PerspectiveCamera:透视相机
    WebGLRenderer:网页三维渲染器
    BoxGeometry:立方几何体
    SphereGeometry:球几何体
    MeshBasicMaterial:基础材质
    Mesh:网格
    Vector3:三维向量
    AmbientLight:环境光
    DirectionalLight:平行光
    Group:组
  `],
  ['jQuery', '选择器库', `
    ajax:异步请求
    get:获取
    post:提交
    each:遍历每个
    val:取值
    text:取文本
    html:取标记
    on:绑定事件
    off:解绑事件
    addClass:添加类名
    removeClass:移除类名
    toggleClass:切换类名
    ready:就绪
    find:查找元素
    append:追加元素
    css:设置样式
    show:显示
    hide:隐藏
    attr:属性
    prop:特性
  `],
  ['axios', '接口请求', `
    get:获取
    post:提交
    put:放置
    delete:删除
    patch:补丁
    create:创建
    request:请求
    interceptors:拦截器
    defaults:默认配置
  `],
  ['', '', `
    useState:使用状态
    useEffect:使用副作用
    useRef:使用引用
    useMemo:使用缓存
    useCallback:使用回调缓存
    useReducer:使用归约器
    useContext:使用上下文
    useLayoutEffect:使用布局副作用
    useImperativeHandle:使用命令句柄
    useDeferredValue:使用延迟值
    useTransition:使用过渡
    useId:使用标识
    createContext:创建上下文
    memo:记忆
    ref:引用
    reactive:响应式
    computed:计算属性
    watch:监听
    watchEffect:监听副作用
    onMounted:挂载时
    onUnmounted:卸载时
    onUpdated:更新时
    onBeforeMount:挂载前
    onBeforeUnmount:卸载前
    nextTick:下一帧
    defineComponent:定义组件
    defineProps:定义属性
    defineEmits:定义事件
    toRefs:转为引用
    shallowRef:浅引用
    markRaw:标记原始
    provide:提供
    inject:注入
    debounce:防抖
    throttle:节流
    cloneDeep:深克隆
    isEmpty:是空
    isEqual:相等
    merge:合并对象
    pick:挑选
    omit:忽略
    groupBy:分组
    uniq:去重
    uniqBy:按去重
    flatten:扁平化
    chunk:分块
    capitalize:首字母大写
    camelCase:驼峰命名
    kebabCase:短横线命名
    snakeCase:下划线命名
    startCase:首字母空格命名
  `],
];

const JS_TS = [
  ['', '', `
    Partial:部分
    Required:必需
    Readonly:只读
    Pick:选取
    Omit:省略
    Record:记录
    Exclude:排除
    Extract:提取
    ReturnType:返回类型
    Awaited:等待类型
    NonNullable:非空
    Parameters:参数类型
    ConstructorParameters:构造参数
    InstanceType:实例类型
    ThisType:本类型
  `],
];

// ============================================================
// Python
// ============================================================

const PY_BUILTIN = [
  ['', '', `
    print:打印
    input:输入
    len:长度
    range:范围
    enumerate:枚举
    zip:压缩
    sorted:排序
    reversed:反转
    sum:求和
    abs:绝对值
    min:最小值
    max:最大值
    round:四舍五入
    pow:乘方
    divmod:商余
    open:打开文件
    isinstance:是实例
    issubclass:是子类
    hasattr:有属性
    getattr:获取属性
    setattr:设置属性
    delattr:删除属性
    int:整数
    float:浮点数
    str:字符串
    list:列表
    dict:字典
    tuple:元组
    set:集合
    frozenset:冻结集合
    bool:布尔
    bytes:字节串
    bytearray:字节数组
    complex:复数
    object:对象
    super:父类
    property:属性对象
    staticmethod:静态方法
    classmethod:类方法
    iter:迭代器
    next:下一个
    map:映射
    filter:过滤
    all:全部
    any:任意
    callable:可调用
    globals:全局变量表
    locals:局部变量表
    vars:变量字典
    type:类型
    repr:表示
    format:格式化
    chr:字符
    ord:序数
    hex:十六进制
    oct:八进制
    bin:二进制
    eval:求值
    exec:执行语句
    compile:编译
    hash:哈希值
    slice:切片器
    memoryview:内存视图
    help:帮助
  `],
  ['str', '字符串', `
    upper:转大写
    lower:转小写
    strip:去除空白
    lstrip:去除左空白
    rstrip:去除右空白
    split:分割
    join:连接
    replace:替换
    startswith:以开始
    endswith:以结束
    find:查找
    format:格式化
    title:标题化
    capitalize:首字母大写
    isdigit:是数字
    isalpha:是字母
    encode:编码
    decode:解码
    zfill:零填充
  `],
  ['list', '列表', `
    append:追加
    extend:扩展
    insert:插入
    pop:弹出
    remove:移除
    clear:清空
    copy:复制
    count:计数
    index:索引位置
    sort:就地排序
    reverse:反转自身
  `],
  ['dict', '字典', `
    keys:键
    values:值
    items:条目
    get:获取
    update:更新
    pop:弹出项
    setdefault:设置默认
    fromkeys:从键构造
  `],
  ['set', '集合', `
    add:添加元素
    discard:丢弃
    union:并集
    intersection:交集
    difference:差集
  `],
  ['', '', `
    append:追加
    extend:扩展
    insert:插入
    pop:弹出
    remove:移除
    clear:清空
    copy:复制
    keys:键
    values:值
    items:条目
    get:获取
    update:更新
    add:添加
    read:读取
    write:写入
    readline:读取一行
    readlines:读取所有行
    writelines:写入所有行
    seek:定位
    close:关闭
    flush:刷新
  `],
];

const PY_STDLIB = [
  ['os', '操作系统', `
    path:路径
    path.join:路径.连接
    path.exists:路径.存在
    path.dirname:路径.目录名
    path.basename:路径.文件名
    path.abspath:路径.绝对路径
    path.splitext:路径.分离扩展名
    path.isfile:路径.是文件
    path.isdir:路径.是目录
    path.getsize:路径.获取大小
    path.normpath:路径.规范路径
    path.expanduser:路径.展开用户
    path.split:路径.分割
    getcwd:当前目录
    listdir:列出目录
    makedirs:创建目录
    mkdir:创建单目录
    rmdir:删除目录
    removedirs:删除空目录
    remove:删除
    rename:重命名
    replace:替换文件
    system:执行命令
    environ:环境
    getenv:获取环境变量
    sep:路径分隔符
    name:系统名称
  `],
  ['sys', '系统', `
    argv:参数
    exit:退出
    platform:平台
    version:版本
    path:模块路径
    stdout:标准输出
    stderr:标准错误
    stdin:标准输入
    maxsize:最大整数
    executable:可执行文件
    modules:已加载模块
  `],
  ['json', 'JSON', `
    dumps:转储
    loads:加载
    dump:写入
    load:读取
  `],
  ['random', '随机', `
    random:随机数
    randint:随机整数
    randrange:随机范围
    choice:选择
    choices:多选择
    shuffle:洗牌
    sample:采样
    seed:种子
    uniform:均匀分布
    gauss:高斯分布
    normalvariate:正态分布
    randbytes:随机字节
  `],
  ['time', '时间', `
    sleep:睡眠
    time:当前时间
    strftime:格式化
    strptime:解析时间
    localtime:本地时间
    gmtime:格林尼治时间
    perf_counter:性能计数
    monotonic:单调时钟
    ctime:时间文本
  `],
  ['datetime', '日期时间', `
    datetime:日期时间类
    datetime.now:日期时间类.现在
    datetime.today:日期时间类.今天
    datetime.utcnow:日期时间类.世界现在
    datetime.strptime:日期时间类.解析
    date:日期类
    time:时间类
    timedelta:时间差
    datetime.fromtimestamp:日期时间类.从时间戳
  `],
  ['math', '数学', `
    sqrt:平方根
    pow:乘方
    ceil:向上取整
    floor:向下取整
    fabs:绝对值
    factorial:阶乘
    gcd:最大公约数
    lcm:最小公倍数
    sin:正弦
    cos:余弦
    tan:正切
    pi:圆周率
    e:自然常数
    log:对数
    log2:二对数
    log10:十对数
    exp:指数
    isnan:是空值
    isinf:是无穷
    hypot:斜边
    comb:组合
    perm:排列
    inf:无穷
    tau:全圆周
  `],
  ['re', '正则', `
    match:匹配
    search:搜索
    findall:查找全部
    sub:替换
    split:分割
    compile:编译
    fullmatch:完全匹配
    finditer:查找迭代
    escape:转义
    IGNORECASE:忽略大小写
    MULTILINE:多行模式
  `],
  ['collections', '集合工具', `
    Counter:计数器
    defaultdict:默认字典
    OrderedDict:有序字典
    deque:双端队列
    namedtuple:命名元组
    ChainMap:链式映射
  `],
  ['itertools', '迭代工具', `
    chain:串联
    product:笛卡尔积
    permutations:排列全
    combinations:组合全
    count:无限计数
    cycle:周期循环
    repeat:重复项
    islice:切片迭代
    groupby:分组迭代
  `],
  ['functools', '函数工具', `
    reduce:归约
    partial:部分应用
    lru_cache:最近最少缓存
    wraps:包装
    cmp_to_key:比较转键
  `],
  ['asyncio', '异步库', `
    run:运行
    sleep:睡眠
    gather:收集
    create_task:创建任务
    wait_for:等待
    Queue:队列
    Event:事件
    Lock:锁
    Semaphore:信号量
  `],
  ['threading', '线程', `
    Thread:线程
    Lock:锁
    Event:事件
    Timer:定时器
    current_thread:当前线程
    active_count:活动数
  `],
  ['subprocess', '子进程', `
    run:运行
    Popen:打开进程
    check_output:检查输出
    call:调用
  `],
  ['shutil', '文件工具', `
    copy:复制
    copy2:复制保留
    copytree:复制目录
    move:移动
    rmtree:删除目录树
    disk_usage:磁盘用量
    which:查找程序
  `],
  ['copy', '复制模块', `
    copy:复制
    deepcopy:深复制
  `, true],
  ['glob', '通配', `
    glob:通配匹配
    iglob:迭代匹配
  `],
  ['pathlib', '路径库', `
    Path:路径
    exists:存在
    read_text:读取文本
    write_text:写入文本
    mkdir:创建目录
  `],
  ['typing', '类型提示', `
    List:列表类型
    Dict:字典类型
    Tuple:元组类型
    Set:集合类型
    Optional:可选
    Union:联合
    Any:任意类型
    Callable:可调用类型
    Iterable:可迭代
    Sequence:序列
    Type:类型别名
  `],
  ['dataclasses', '数据类', `
    dataclass:数据类
    field:字段
    asdict:转为字典
    astuple:转为元组
  `],
  ['logging', '日志', `
    getLogger:获取日志器
    info:信息
    debug:调试
    warning:警告
    error:错误
    critical:严重
    basicConfig:基础配置
    exception:异常
  `],
  ['uuid', '唯一标识', `
    uuid4:生成标识四
    uuid1:生成标识一
  `],
  ['hashlib', '哈希库', `
    md5:摘要五
    sha256:摘要二五六
  `],
  ['base64', '编码库', `
    b64encode:编码
    b64decode:解码
  `],
  ['csv', '逗号分隔', `
    reader:读取器
    writer:写入器
    DictReader:字典读取器
    DictWriter:字典写入器
  `],
  ['sqlite3', '轻量数据库', `
    connect:连接
    Cursor:游标
    execute:执行
    commit:提交
    fetchall:取全部
    fetchone:取一个
  `],
  ['urllib', '网址库', `
    request:请求
    parse:解析
    urlopen:打开网址
  `],
  ['socket', '套接字', `
    socket:套接字
    bind:绑定
    listen:监听
    accept:接受
    recv:接收
    send:发送
  `],
  ['argparse', '参数解析', `
    ArgumentParser:参数解析器
    add_argument:添加参数
    parse_args:解析参数
  `],
  ['platform', '平台', `
    system:系统名
    python_version:版本
    node:节点名
  `],
  ['enum', '枚举库', `
    Enum:枚举类
    IntEnum:整数枚举
  `],
  ['contextlib', '上下文工具', `
    contextmanager:上下文管理器
    suppress:抑制
  `],
  ['tempfile', '临时文件', `
    NamedTemporaryFile:命名临时文件
    TemporaryDirectory:临时目录
  `],
  ['zipfile', '压缩文件', `
    ZipFile:压缩文件
    extractall:全部解压
  `],
  ['pprint', '美化打印', `
    pprint:美化打印
    pformat:美化格式化
  `],
  ['statistics', '统计', `
    mean:平均值
    median:中位数
    mode:众数
    stdev:标准差
    variance:方差
  `],
  ['decimal', '十进制', `
    Decimal:十进制数
    getcontext:获取上下文
  `],
  ['fractions', '分数', `
    Fraction:分数
  `],
  ['pytest', '测试框架', `
    fixture:夹具
    mark:标记
    raises:断言异常
    approx:约等于
  `],
  ['unittest', '单元测试', `
    TestCase:测试用例
    assertEqual:断言相等
    assertTrue:断言真
    assertFalse:断言假
  `],
  ['tqdm', '进度条', `
    tqdm:进度条
    trange:进度范围
  `],
  ['dotenv', '环境文件', `
    load_dotenv:加载环境变量
  `],
  ['openpyxl', '表格库', `
    load_workbook:加载工作簿
    Workbook:工作簿
  `],
  ['aiohttp', '异步请求', `
    ClientSession:客户端会话
    get:获取
    post:提交
  `],
];

// 第二轮补充：标准库其余公开可调用成员（补全列表全中文）
const PY_STDLIB2 = [
  ['os', '操作系统', `
    path.commonpath:路径.公共路径
    path.commonprefix:路径.公共前缀
    path.expandvars:路径.展开变量
    path.getatime:路径.访问时间
    path.getctime:路径.创建时间
    path.getmtime:路径.修改时间
    path.isabs:路径.是绝对
    path.islink:路径.是链接
    path.ismount:路径.是挂载点
    path.isjunction:路径.是联接
    path.isdevdrive:路径.是开发盘
    path.isreserved:路径.是保留名
    path.lexists:路径.存在链接
    path.normcase:路径.规范大小写
    path.realpath:路径.真实路径
    path.relpath:路径.相对路径
    path.samefile:路径.同一文件
    path.sameopenfile:路径.同一打开文件
    path.samestat:路径.同一状态
    path.splitdrive:路径.分离驱动器
    path.splitroot:路径.分离根
    access:检查权限
    chdir:切换目录
    chmod:修改权限
    close:关闭描述符
    closerange:关闭范围
    cpu_count:处理器数
    device_encoding:设备编码
    dup:复制描述符
    dup2:复制描述符到
    fdopen:描述符打开
    fsdecode:文件名解码
    fsencode:文件名编码
    fspath:文件路径
    fstat:描述符状态
    fsync:同步磁盘
    ftruncate:截断描述符
    get_blocking:获取阻塞
    set_blocking:设置阻塞
    get_exec_path:获取执行路径
    get_handle_inheritable:句柄可继承
    set_handle_inheritable:设置句柄可继承
    get_inheritable:获取可继承
    set_inheritable:设置可继承
    get_terminal_size:终端大小
    getcwdb:当前目录字节
    getlogin:登录用户名
    getpid:进程标识
    getppid:父进程标识
    isatty:是终端
    kill:终止进程
    lchmod:修改链接权限
    link:创建链接
    listdrives:列出磁盘
    listmounts:列出挂载
    listvolumes:列出卷
    lseek:移动读写指针
    lstat:链接状态
    open:打开文件
    pipe:创建管道
    popen:管道进程
    read:读取描述符
    readinto:读入缓冲
    readlink:读取链接
    reload_environ:重载环境
    renames:重命名链
    scandir:扫描目录
    spawnl:派生执行
    spawnle:派生执行环境
    spawnv:派生执行参数
    spawnve:派生执行参数环境
    startfile:启动文件
    stat:获取状态
    stat_result:状态结果
    statvfs_result:文件系统状态
    strerror:错误文本
    symlink:创建符号链接
    terminal_size:终端尺寸
    times:进程时间
    times_result:进程时间结果
    truncate:截断文件
    umask:修改掩码
    uname_result:系统信息结果
    unlink:删除文件
    unsetenv:删除环境变量
    urandom:随机字节流
    utime:修改访问时间
    walk:遍历目录
    waitpid:等待子进程
    waitstatus_to_exitcode:等待状态转退出码
    write:写入描述符
    DirEntry:目录项
    PathLike:路径协议
    error:操作系统错误
  `],
  ['sys', '系统', `
    getsizeof:获取大小
    getrefcount:获取引用计数
    getrecursionlimit:获取递归上限
    setrecursionlimit:设置递归上限
    getdefaultencoding:默认编码
    getfilesystemencoding:文件系统编码
    getfilesystemencodeerrors:文件系统编码错误
    getswitchinterval:获取切换间隔
    setswitchinterval:设置切换间隔
    getprofile:获取性能钩子
    setprofile:设置性能钩子
    gettrace:获取追踪钩子
    settrace:设置追踪钩子
    exc_info:异常信息
    excepthook:异常钩子
    unraisablehook:不可忽略异常钩子
    displayhook:显示钩子
    breakpointhook:断点钩子
    addaudithook:添加审计钩子
    audit:审计
    intern:驻留字符串
    is_finalizing:正在结束
    getwindowsversion:视窗版本
    getallocatedblocks:已分配块数
    getunicodeinternedsize:驻留文本大小
    get_int_max_str_digits:整数位数上限
    set_int_max_str_digits:设置整数位数上限
    get_asyncgen_hooks:获取异步生成钩子
    set_asyncgen_hooks:设置异步生成钩子
    get_coroutine_origin_tracking_depth:获取协程追踪深度
    set_coroutine_origin_tracking_depth:设置协程追踪深度
    activate_stack_trampoline:启用栈跳板
    deactivate_stack_trampoline:停用栈跳板
    is_stack_trampoline_active:栈跳板已启用
    is_remote_debug_enabled:远程调试已启用
    remote_exec:远程执行
    call_tracing:调用追踪
  `],
  ['json', 'JSON', `
    JSONDecodeError:解码错误
    JSONDecoder:解码器
    JSONEncoder:编码器
    detect_encoding:检测编码
  `],
  ['random', '随机', `
    Random:随机对象
    SystemRandom:系统随机对象
    getstate:获取状态
    setstate:设置状态
    getrandbits:随机位
    betavariate:贝塔分布
    binomialvariate:二项分布
    expovariate:指数分布
    gammavariate:伽马分布
    lognormvariate:对数正态分布
    paretovariate:帕累托分布
    triangular:三角分布
    vonmisesvariate:冯米塞斯分布
    weibullvariate:威布尔分布
    main:命令行入口
  `],
  ['time', '时间', `
    asctime:时间转文本
    mktime:转为时间戳
    get_clock_info:获取时钟信息
    monotonic_ns:单调纳秒
    perf_counter_ns:性能计数纳秒
    process_time:进程时间
    process_time_ns:进程时间纳秒
    thread_time:线程时间
    thread_time_ns:线程时间纳秒
    time_ns:当前时间纳秒
    struct_time:时间结构
  `],
  ['datetime', '日期时间', `
    timezone:时区
    tzinfo:时区信息
  `],
  ['math', '数学', `
    acos:反余弦
    acosh:反双曲余弦
    asin:反正弦
    asinh:反双曲正弦
    atan:反正切
    atan2:反正切二
    atanh:反双曲正切
    cbrt:立方根
    copysign:带符号复制
    cosh:双曲余弦
    degrees:转角度
    radians:转弧度
    dist:距离
    erf:误差函数
    erfc:补误差函数
    exp2:二指数
    expm1:指数减一
    fma:乘加
    fmod:浮点余数
    frexp:分解浮点
    fsum:精确求和
    gamma:伽马函数
    lgamma:对数伽马
    isclose:接近相等
    isfinite:是有限数
    isqrt:整数平方根
    ldexp:浮点乘二次幂
    log1p:对数加一
    modf:分解整数小数
    nextafter:下一个浮点
    prod:乘积
    remainder:余数
    sinh:双曲正弦
    sumprod:求和乘积
    tanh:双曲正切
    trunc:截断
    ulp:浮点间距
  `],
  ['re', '正则', `
    Match:匹配对象
    Pattern:模式对象
    RegexFlag:正则标志
    Scanner:扫描器
    error:正则错误
    purge:清空缓存
    subn:替换计数
  `],
  ['collections', '集合工具', `
    UserDict:用户字典
    UserList:用户列表
    UserString:用户字符串
    abc:抽象基类模块
    heapq:堆队列模块
  `],
  ['itertools', '迭代工具', `
    accumulate:累积
    batched:分批
    combinations_with_replacement:可重复组合
    compress:压缩筛选
    dropwhile:丢弃当
    filterfalse:过滤假
    pairwise:成对
    starmap:星映射
    takewhile:取当
    tee:复制迭代
    zip_longest:拉链最长
  `],
  ['functools', '函数工具', `
    cache:缓存
    cached_property:缓存属性
    get_cache_token:获取缓存令牌
    itemgetter:项获取器
    partialmethod:部分方法
    recursive_repr:递归表示
    singledispatch:单分派
    singledispatchmethod:单分派方法
    total_ordering:全序
    update_wrapper:更新包装
  `],
  ['asyncio', '异步库', `
    Future:未来对象
    Task:任务对象
    TaskGroup:任务组
    Timeout:超时
    timeout:超时上下文
    timeout_at:定时超时
    create_subprocess_exec:创建子进程执行
    create_subprocess_shell:创建子进程外壳
    open_connection:打开连接
    start_server:启动服务
    get_event_loop:获取事件循环
    get_running_loop:获取运行循环
    set_event_loop:设置事件循环
    new_event_loop:新事件循环
    get_event_loop_policy:获取循环策略
    set_event_loop_policy:设置循环策略
    run_coroutine_threadsafe:线程安全运行协程
    all_tasks:全部任务
    current_task:当前任务
    as_completed:完成迭代
    ensure_future:确保未来
    wrap_future:包装未来
    shield:屏蔽取消
    wait:等待完成
    to_thread:转到线程
    iscoroutine:是协程
    iscoroutinefunction:是协程函数
    isfuture:是未来对象
    StreamReader:流读取器
    StreamWriter:流写入器
    Server:服务器
    Runner:运行器
    QueueEmpty:队列空
    QueueFull:队列满
    ShutDown:队列关闭
    Condition:条件变量
    BoundedSemaphore:有界信号量
    Barrier:屏障
    CancelledError:取消错误
    TimeoutError:超时错误
    InvalidStateError:无效状态错误
    IncompleteReadError:读取不完整错误
    LimitOverrunError:超限错误
    BrokenBarrierError:屏障破坏错误
  `],
  ['threading', '线程', `
    Barrier:屏障
    BoundedSemaphore:有界信号量
    Condition:条件变量
    Semaphore:信号量
    RLock:可重入锁
    local:线程局部
    ThreadError:线程错误
    get_ident:获取标识
    get_native_id:获取原生标识
    main_thread:主线程
    currentThread:当前线程旧名
    activeCount:活动数旧名
    enumerate:枚举线程
    excepthook:线程异常钩子
    getprofile:获取性能钩子
    setprofile:设置性能钩子
    gettrace:获取追踪钩子
    settrace:设置追踪钩子
    setprofile_all_threads:设置全部性能钩子
    settrace_all_threads:设置全部追踪钩子
    stack_size:栈大小
    BrokenBarrierError:屏障破坏错误
  `],
  ['subprocess', '子进程', `
    CompletedProcess:完成进程
    CalledProcessError:调用进程错误
    TimeoutExpired:超时过期
    SubprocessError:子进程错误
    check_call:检查调用
    getoutput:获取输出
    getstatusoutput:获取状态输出
    list2cmdline:列表转命令行
    STARTUPINFO:启动信息
    Handle:句柄
  `],
  ['shutil', '文件工具', `
    Error:错误
    ReadError:读取错误
    SameFileError:同一文件错误
    SpecialFileError:特殊文件错误
    RegistryError:注册表错误
    copyfile:复制文件
    copyfileobj:复制文件对象
    copymode:复制权限
    copystat:复制状态
    chown:修改所有者
    get_terminal_size:终端大小
    get_archive_formats:获取归档格式
    get_unpack_formats:获取解包格式
    ignore_patterns:忽略模式
    make_archive:创建归档
    unpack_archive:解包归档
    register_archive_format:注册归档格式
    unregister_archive_format:注销归档格式
    register_unpack_format:注册解包格式
    unregister_unpack_format:注销解包格式
  `],
  ['pathlib', '路径库', `
    PurePath:纯路径
    PurePosixPath:纯正斜杠路径
    PureWindowsPath:纯反斜杠路径
    PosixPath:正斜杠路径
    WindowsPath:反斜杠路径
    UnsupportedOperation:不支持操作
  `],
  ['typing', '类型提示', `
    AbstractSet:抽象集合类型
    AsyncGenerator:异步生成器类型
    AsyncIterable:异步可迭代类型
    AsyncIterator:异步迭代器类型
    Awaitable:可等待类型
    BinaryIO:二进制流类型
    ByteString:字节串类型
    ChainMap:链映射类型
    ClassVar:类变量类型
    Collection:集合抽象类型
    Concatenate:拼接类型
    Container:容器类型
    Coroutine:协程类型
    Counter:计数器类型
    DefaultDict:默认字典类型
    Deque:双端队列类型
    Final:最终类型
    FrozenSet:冻结集合类型
    Generator:生成器类型
    Generic:泛型
    GenericAlias:泛型别名
    Hashable:可哈希类型
    IO:流类型
    ItemsView:项视图类型
    Iterator:迭代器类型
    KeysView:键视图类型
    Literal:字面量类型
    LiteralString:字面量文本类型
    Mapping:映射类型
    MappingView:映射视图类型
    MutableMapping:可变映射类型
    MutableSequence:可变序列类型
    MutableSet:可变集合类型
    NamedTuple:命名元组类型
    Never:永不类型
    NewType:新类型
    NoReturn:无返回类型
    NotRequired:非必需键
    ParamSpec:参数规格
    ParamSpecArgs:参数规格参数
    ParamSpecKwargs:参数规格关键字
    Protocol:协议类型
    ReadOnly:只读类型
    Required:必需键
    Reversible:可反转类型
    Self:自身类型
    Sized:有大小类型
    SupportsAbs:支持绝对值
    SupportsBytes:支持字节
    SupportsComplex:支持复数
    SupportsFloat:支持浮点
    SupportsIndex:支持索引
    SupportsInt:支持整数
    SupportsRound:支持舍入
    Text:文本类型
    TextIO:文本流类型
    TypeAlias:别名声明
    TypeGuard:类型守卫
    TypeIs:类型是
    TypeVar:类型变量
    TypeVarTuple:类型变量元组
    TypedDict:类型字典
    Unpack:解包类型
    ValuesView:值视图类型
    Annotated:注解类型
    cast:类型转换
    overload:重载
    final:最终装饰器
    override:重写
    get_args:获取参数
    get_origin:获取来源
    get_type_hints:获取类型提示
    get_overloads:获取重载
    get_protocol_members:获取协议成员
    assert_type:断言类型
    assert_never:断言永不
    runtime_checkable:可运行时检查
    is_protocol:是协议
    is_typeddict:是类型字典
    no_type_check:禁用类型检查
    no_type_check_decorator:禁用类型检查装饰器
    dataclass_transform:数据类转换
    reveal_type:显示类型
    abstractmethod:抽象方法
  `],
  ['logging', '日志', `
    Logger:日志器
    RootLogger:根日志器
    LoggerAdapter:日志器适配器
    LogRecord:日志记录
    Handler:处理器
    StreamHandler:流处理器
    FileHandler:文件处理器
    NullHandler:空处理器
    Formatter:格式化器
    Filter:过滤器
    Filterer:过滤基类
    Manager:管理器
    BufferingFormatter:缓冲格式化器
    PlaceHolder:占位符
    addLevelName:添加级别名
    getLevelName:获取级别名
    getLevelNamesMapping:获取级别名映射
    getLoggerClass:获取日志器类
    setLoggerClass:设置日志器类
    getLogRecordFactory:获取记录工厂
    setLogRecordFactory:设置记录工厂
    getHandlerByName:按名获取处理器
    getHandlerNames:获取处理器名
    makeLogRecord:创建记录
    captureWarnings:捕获警告
    currentframe:当前帧
    disable:禁用
    shutdown:关闭
    log:记录
    fatal:致命
    warn:警告旧名
  `],
  ['uuid', '唯一标识', `
    UUID:标识对象
    SafeUUID:安全标识
    uuid3:生成标识三
    uuid5:生成标识五
    uuid6:生成标识六
    uuid7:生成标识七
    uuid8:生成标识八
    getnode:获取节点
    bytes_:字节标识
    int_:整数标识
    main:命令行入口
  `],
  ['hashlib', '哈希库', `
    new:新建摘要
    file_digest:文件摘要
    pbkdf2_hmac:密钥派生
    scrypt:密钥派生二
    sha1:摘要一
    sha224:摘要二二四
    sha384:摘要三八四
    sha512:摘要五一二
    sha3_224:摘要三二二四
    sha3_256:摘要三二五六
    sha3_384:摘要三三八四
    sha3_512:摘要三五一二
    shake_128:可变摘要一二八
    shake_256:可变摘要二五六
    blake2b:摘要二大
    blake2s:摘要二小
  `],
  ['base64', '编码库', `
    encode:编码字节
    decode:解码字节
    encodebytes:编码多行
    decodebytes:解码多行
    urlsafe_b64encode:网址安全编码
    urlsafe_b64decode:网址安全解码
    standard_b64encode:标准编码
    standard_b64decode:标准解码
    b16encode:十六进制编码
    b16decode:十六进制解码
    b32encode:三二编码
    b32decode:三二解码
    b32hexencode:三二十六编码
    b32hexdecode:三二十六解码
    b85encode:八五编码
    b85decode:八五解码
    a85encode:八五编码甲
    a85decode:八五解码甲
    z85encode:八五编码乙
    z85decode:八五解码乙
    main:命令行入口
  `],
  ['csv', '逗号分隔', `
    Dialect:方言
    Error:错误
    Sniffer:嗅探器
    excel:表格方言
    excel_tab:表格制表方言
    unix_dialect:统一方言
    field_size_limit:字段大小上限
    get_dialect:获取方言
    list_dialects:列出方言
    register_dialect:注册方言
    unregister_dialect:注销方言
  `],
  ['sqlite3', '轻量数据库', `
    Connection:连接对象
    Row:行对象
    Blob:二进制对象
    Binary:二进制类型
    PrepareProtocol:准备协议
    adapt:适配
    register_adapter:注册适配器
    register_converter:注册转换器
    complete_statement:完整语句检查
    enable_callback_tracebacks:启用回调追踪
    Error:错误
    DatabaseError:数据库错误
    DataError:数据错误
    IntegrityError:完整性错误
    InterfaceError:接口错误
    InternalError:内部错误
    NotSupportedError:不支持错误
    OperationalError:操作错误
    ProgrammingError:编程错误
    Warning:警告
    Date:日期
    Time:时间
    Timestamp:时间戳
    DateFromTicks:日期从计数
    TimeFromTicks:时间从计数
    TimestampFromTicks:时间戳从计数
  `],
  ['socket', '套接字', `
    create_connection:创建连接
    create_server:创建服务
    getaddrinfo:获取地址信息
    getdefaulttimeout:获取默认超时
    setdefaulttimeout:设置默认超时
    gethostname:获取主机名
    gethostbyname:按名获取主机
    gethostbyname_ex:按名获取主机扩展
    gethostbyaddr:按地址获取主机
    getfqdn:获取全名
    getnameinfo:获取名称信息
    getprotobyname:按名获取协议
    getservbyname:按名获取服务
    getservbyport:按端口获取服务
    has_ipv6:支持六版
    has_dualstack_ipv6:支持双栈六版
    if_indextoname:索引转接口名
    if_nametoindex:接口名转索引
    if_nameindex:接口名索引
    inet_aton:地址转数值
    inet_ntoa:数值转地址
    inet_pton:地址转字节
    inet_ntop:字节转地址
    htonl:主机转网络长
    htons:主机转网络短
    ntohl:网络转主机长
    ntohs:网络转主机短
    socketpair:套接字对
    fromfd:从描述符
    fromshare:从共享
    error:套接字错误
    gaierror:地址错误
    herror:主机错误
    timeout:超时错误
    SocketType:套接字类型
    AddressFamily:地址族
    SocketKind:套接字种类
    MsgFlag:消息标志
    AddressInfo:地址信息
  `],
  ['argparse', '参数解析', `
    Namespace:命名空间
    Action:动作
    FileType:文件类型
    HelpFormatter:帮助格式化器
    RawTextHelpFormatter:原始文本帮助
    RawDescriptionHelpFormatter:原始描述帮助
    ArgumentDefaultsHelpFormatter:默认值帮助
    MetavarTypeHelpFormatter:元变量类型帮助
    BooleanOptionalAction:布尔可选动作
    ArgumentError:参数错误
    ArgumentTypeError:参数类型错误
    ngettext:多语言文本
  `],
  ['platform', '平台', `
    machine:机器类型
    release:发行版
    version:版本号
    platform:平台名
    processor:处理器
    architecture:架构
    uname:系统信息
    python_build:构建信息
    python_compiler:编译器
    python_implementation:实现
    python_revision:修订
    python_version_tuple:版本元组
    python_branch:分支
    libc_ver:库版本
    win32_ver:视窗版本
    win32_edition:视窗版本类型
    win32_is_iot:视窗物联网
    mac_ver:苹果版本
    java_ver:爪哇版本
    ios_ver:苹果移动版本
    android_ver:安卓版本
    freedesktop_os_release:桌面系统发行
    system_alias:系统别名
    uname_result:系统信息结果
    AndroidVer:安卓版本类
    IOSVersionInfo:苹果移动版本信息
  `],
  ['enum', '枚举库', `
    StrEnum:文本枚举
    Flag:标志枚举
    IntFlag:整数标志
    FlagBoundary:标志边界
    ReprEnum:表示枚举
    auto:自动值
    unique:唯一装饰器
    verify:校验装饰器
    member:成员
    nonmember:非成员
    global_enum:全局枚举
    global_str:全局文本
    global_enum_repr:全局枚举表示
    global_flag_repr:全局标志表示
    show_flag_values:显示标志值
    EnumMeta:枚举元类
    EnumDict:枚举字典
    EnumCheck:枚举检查
    DynamicClassAttribute:动态类属性
    pickle_by_enum_name:按枚举名序列化
    pickle_by_global_name:按全局名序列化
  `],
  ['glob', '通配', `
    escape:转义
    has_magic:含通配
    translate:翻译模式
  `],
  ['tempfile', '临时文件', `
    TemporaryFile:临时文件
    SpooledTemporaryFile:缓冲临时文件
    mkdtemp:创建临时目录
    mkstemp:创建临时文件
    mktemp:临时名旧
    gettempdir:获取临时目录
    gettempdirb:获取临时目录字节
    gettempprefix:获取临时前缀
    gettempprefixb:获取临时前缀字节
  `],
  ['zipfile', '压缩文件', `
    ZipInfo:压缩信息
    BadZipFile:损坏压缩文件
    LargeZipFile:过大压缩文件
    PyZipFile:脚本压缩文件
    Path:压缩路径
    ZipExtFile:压缩解压文件
    is_zipfile:是压缩文件
    crc32:循环冗余校验
    LZMACompressor:压缩器
    LZMADecompressor:解压器
  `],
  ['pprint', '美化打印', `
    PrettyPrinter:美化打印器
    saferepr:安全表示
    isreadable:可读
    isrecursive:是递归
  `],
  ['statistics', '统计', `
    StatisticsError:统计错误
    NormalDist:正态分布
    LinearRegression:线性回归
    linear_regression:线性回归函数
    fmean:浮点平均
    geometric_mean:几何平均
    harmonic_mean:调和平均
    median_low:低位中位数
    median_high:高位中位数
    median_grouped:分组中位数
    multimode:多众数
    quantiles:分位数
    pstdev:总体标准差
    pvariance:总体方差
    correlation:相关系数
    covariance:协方差
    kde:核密度估计
    kde_random:核密度随机
    count:计数
    sumprod:求和乘积
  `],
  ['decimal', '十进制', `
    setcontext:设置上下文
    localcontext:本地上下文
    Context:上下文
    BasicContext:基础上下文
    ExtendedContext:扩展上下文
    DefaultContext:默认上下文
    DecimalException:十进制错误
    Clamped:钳制
    Inexact:不精确
    InvalidOperation:无效操作
    DivisionByZero:除零
    Overflow:溢出
    Underflow:下溢
    Rounded:舍入
    Subnormal:次正规
    ConversionSyntax:转换语法
    DivisionImpossible:除法不可能
    DivisionUndefined:除法未定义
    InvalidContext:无效上下文
    FloatOperation:浮点操作
  `],
  ['copy', '复制模块', `
    Error:错误
    error:错误旧名
    replace:替换
  `, true],
  ['string', '字符串库', `
    Formatter:格式化器
    Template:模板
    capwords:首字母大写
  `],
  ['struct', '结构', `
    Struct:结构体
    calcsize:计算大小
    pack:打包
    pack_into:打包到
    unpack:解包
    unpack_from:从解包
    iter_unpack:迭代解包
    error:结构错误
  `],
  ['secrets', '安全随机', `
    SystemRandom:系统随机对象
    choice:选择
    randbelow:低于随机
    randbits:随机位
    token_bytes:令牌字节
    token_hex:令牌十六进制
    token_urlsafe:令牌网址安全
    compare_digest:比较摘要
  `],
  ['textwrap', '文本换行', `
    TextWrapper:换行器
    fill:填充换行
    wrap:换行
    dedent:去除缩进
    indent:添加缩进
    shorten:缩短
  `],
  ['dataclasses', '数据类', `
    Field:字段对象
    FrozenInstanceError:冻结实例错误
    InitVar:初始化变量
    fields:字段列表
    is_dataclass:是数据类
    make_dataclass:创建数据类
    replace:替换字段
    recursive_repr:递归表示
  `],
  ['contextlib', '上下文工具', `
    asynccontextmanager:异步上下文管理器
    closing:关闭器
    nullcontext:空上下文
    ExitStack:退出栈
    AsyncExitStack:异步退出栈
    ContextDecorator:上下文装饰器
    AsyncContextDecorator:异步上下文装饰器
    AbstractContextManager:抽象上下文管理器
    AbstractAsyncContextManager:抽象异步上下文管理器
    aclosing:异步关闭器
    redirect_stdout:重定向标准输出
    redirect_stderr:重定向标准错误
    chdir:切换目录
    wraps:包装
  `],
  ['io', '输入输出', `
    open:打开
    open_code:打开代码
    text_encoding:文本编码
    BytesIO:字节流
    StringIO:文本流
    FileIO:文件流
    BufferedReader:缓冲读取器
    BufferedWriter:缓冲写入器
    BufferedRandom:缓冲随机
    BufferedRWPair:缓冲读写对
    TextIOWrapper:文本包装器
    IncrementalNewlineDecoder:增量换行解码
    IOBase:基类
    RawIOBase:原始基类
    BufferedIOBase:缓冲基类
    TextIOBase:文本基类
    Reader:读取器
    Writer:写入器
    UnsupportedOperation:不支持操作
    BlockingIOError:阻塞错误
  `],
  ['calendar', '日历', `
    Calendar:日历
    TextCalendar:文本日历
    HTMLCalendar:网页日历
    LocaleTextCalendar:本地文本日历
    LocaleHTMLCalendar:本地网页日历
    Month:月枚举
    Day:日枚举
    isleap:是闰年
    leapdays:闰年天数
    monthrange:月范围
    monthcalendar:月日历
    weekday:星期几
    weekheader:星期标题
    timegm:时间转历
    prmonth:打印月
    prcal:打印年
    month:月名
    week:周
    firstweekday:第一个星期
    setfirstweekday:设置第一个星期
    different_locale:不同区域
    format:格式化
    formatstring:格式化字符串
    month_name:月份名
    month_abbr:月份缩写
    day_name:星期名
    day_abbr:星期缩写
    IllegalMonthError:非法月份错误
    IllegalWeekdayError:非法星期错误
    main:命令行入口
  `],
  ['queue', '队列', `
    Queue:队列
    LifoQueue:后进先出队列
    PriorityQueue:优先队列
    SimpleQueue:简单队列
    Empty:空错误
    Full:满错误
    ShutDown:关闭错误
  `],
  ['ssl', '安全套接层', `
    SSLContext:安全上下文
    create_default_context:创建默认上下文
    create_connection:创建安全连接
    get_server_certificate:获取服务证书
    get_protocol_name:获取协议名
    cert_time_to_seconds:证书时间转秒
    enum_certificates:枚举证书
    enum_crls:枚举吊销列表
    get_default_verify_paths:获取默认校验路径
    DER_cert_to_PEM_cert:证书转文本
    PEM_cert_to_DER_cert:文本转证书
    SSLSocket:安全套接字
    SSLError:安全错误
    SSLZeroReturnError:安全零返回错误
    SSLWantReadError:安全待读错误
    SSLWantWriteError:安全待写错误
    SSLEOFError:安全结束错误
    SSLSyscallError:安全系统调用错误
    SSLCertVerificationError:证书校验错误
    CertificateError:证书错误
    MemoryBIO:内存缓冲
    DefaultVerifyPaths:默认校验路径
    Options:选项
    VerifyMode:校验模式
    VerifyFlags:校验标志
    TLSVersion:安全协议版本
    AlertDescription:警报描述
    Purpose:用途
    SSLErrorNumber:错误号
    SSLObject:安全对象
    SSLSession:安全会话
    RAND_bytes:随机字节
    RAND_add:随机添加
    RAND_status:随机状态
    socket_error:套接字错误
  `],
  ['warnings', '警告', `
    WarningMessage:警告消息
    catch_warnings:捕获警告上下文
    deprecated:弃用装饰器
    filterwarnings:过滤警告
    simplefilter:简单过滤
    formatwarning:格式化警告
    showwarning:显示警告
    resetwarnings:重置警告
    warn:发出警告
    warn_explicit:显式警告
  `],
  ['inspect', '内省', `
    getmembers:获取成员
    getmembers_static:静态获取成员
    getdoc:获取文档
    getsource:获取源码
    getsourcelines:获取源码行
    getsourcefile:获取源码文件
    getfile:获取文件
    getabsfile:获取绝对文件
    getmodule:获取模块
    getmodulename:获取模块名
    getmro:获取方法解析顺序
    getfullargspec:获取完整参数规格
    signature:签名
    getcallargs:获取调用参数
    getclosurevars:获取闭包变量
    get_annotations:获取注解
    getcomments:获取注释
    getframeinfo:获取帧信息
    getlineno:获取行号
    getouterframes:获取外层帧
    getinnerframes:获取内层帧
    currentframe:当前帧
    stack:调用栈
    trace:追踪
    getgeneratorstate:获取生成器状态
    getgeneratorlocals:获取生成器局部
    getcoroutinestate:获取协程状态
    getcoroutinelocals:获取协程局部
    getasyncgenstate:获取异步生成器状态
    getasyncgenlocals:获取异步生成器局部
    isawaitable:是可等待
    iscoroutine:是协程
    iscoroutinefunction:是协程函数
    isasyncgen:是异步生成器
    isasyncgenfunction:是异步生成器函数
    isgenerator:是生成器
    isgeneratorfunction:是生成器函数
    isclass:是类
    isfunction:是函数
    ismethod:是方法
    ismethoddescriptor:是方法描述符
    ismethodwrapper:是方法包装
    isbuiltin:是内置
    iscode:是代码
    isframe:是帧
    istraceback:是回溯
    ismodule:是模块
    ispackage:是包
    isroutine:是例程
    isabstract:是抽象
    iskeyword:是关键字
    isdatadescriptor:是数据描述符
    isgetsetdescriptor:是获取设置描述符
    ismemberdescriptor:是成员描述符
    unwrap:解包装饰
    cleandoc:清除文档缩进
    getattr_static:静态获取属性
    findsource:查找源码
    getblock:获取代码块
    getclasstree:获取类树
    classify_class_attrs:分类类属性
    formatargvalues:格式化参数值
    formatannotation:格式化注解
    make_weakref:创建弱引用
    walktree:遍历树
    indentsize:缩进大小
    markcoroutinefunction:标记协程函数
    Signature:签名对象
    Parameter:参数对象
    FrameInfo:帧信息
    Traceback:回溯对象
    BoundArguments:绑定参数
    FullArgSpec:完整参数规格对象
    ArgInfo:参数信息
    Arguments:参数
    Attribute:属性
    ClosureVars:闭包变量
  `],
  ['operator', '运算符', `
    add:加
    sub:减
    mul:乘
    truediv:真除
    floordiv:整除
    mod:取模
    pow:幂
    neg:负
    pos:正
    abs:绝对值
    invert:按位取反
    inv:按位取反旧名
    lshift:左移
    rshift:右移
    and_:按位与
    or_:按位或
    xor:按位异或
    iadd:就地加
    isub:就地减
    imul:就地乘
    itruediv:就地真除
    ifloordiv:就地整除
    imod:就地取模
    ipow:就地幂
    ilshift:就地左移
    irshift:就地右移
    iand:就地与
    ior:就地或
    ixor:就地异或
    iconcat:就地连接
    matmul:矩阵乘
    imatmul:就地矩阵乘
    concat:连接
    contains:包含
    countOf:计数
    indexOf:索引
    delitem:删除项
    getitem:获取项
    setitem:设置项
    length_hint:长度提示
    truth:真值
    is_:是
    is_not:不是
    attrgetter:属性获取器
    itemgetter:项获取器
    methodcaller:方法调用器
    call:调用
  `],
  ['heapq', '堆队列', `
    heapify:建堆
    heappush:入堆
    heappop:出堆
    heappushpop:入堆出堆
    heapreplace:替换堆顶
    nlargest:最大若干
    nsmallest:最小若干
    merge:合并迭代
    heapify_max:建最大堆
    heappush_max:入最大堆
    heappop_max:出最大堆
    heappushpop_max:入出最大堆
    heapreplace_max:替换最大堆顶
  `],
  ['bisect', '二分', `
    bisect:二分查找
    bisect_left:二分左
    bisect_right:二分右
    insort:插入有序
    insort_left:插入有序左
    insort_right:插入有序右
  `],
  ['array', '数组库', `
    array:数组
    ArrayType:数组类型
  `],
  ['html', '网页', `
    escape:转义
    unescape:反转义
  `],
  ['http', '网页协议', `
    HTTPStatus:状态码
    HTTPMethod:方法
  `],
  ['pickle', '序列化', `
    dump:转储
    dumps:转储为字节
    load:加载
    loads:从字节加载
    Pickler:序列化器
    Unpickler:反序列化器
    PickleError:序列化错误
    PicklingError:序列化失败
    UnpicklingError:反序列化失败
    PickleBuffer:序列化缓冲
    decode_long:解码长整数
    encode_long:编码长整数
    whichmodule:查找模块
  `],
  ['timeit', '计时', `
    Timer:计时器
    default_timer:默认计时器
    timeit:计时执行
    repeat:重复计时
    reindent:重排缩进
    main:命令行入口
  `],
  ['traceback', '回溯', `
    format_exc:格式化当前异常
    format_exception:格式化异常
    format_exception_only:格式化异常简
    format_tb:格式化回溯
    format_stack:格式化栈
    format_list:格式化列表
    print_exc:打印当前异常
    print_exception:打印异常
    print_tb:打印回溯
    print_stack:打印栈
    print_last:打印最后
    print_list:打印列表
    extract_tb:提取回溯
    extract_stack:提取栈
    walk_tb:遍历回溯
    walk_stack:遍历栈
    clear_frames:清除帧
    TracebackException:回溯异常
    StackSummary:栈摘要
    FrameSummary:帧摘要
    suppress:抑制
  `],
  ['importlib', '导入库', `
    import_module:导入模块
    invalidate_caches:失效缓存
    reload:重载模块
  `],
  ['weakref', '弱引用', `
    ref:引用
    proxy:代理
    finalize:终结器
    WeakValueDictionary:弱值字典
    WeakKeyDictionary:弱键字典
    WeakSet:弱集合
    WeakMethod:弱方法
    ReferenceType:引用类型
    ProxyType:代理类型
    CallableProxyType:可调用代理类型
    KeyedRef:键引用
    getweakrefcount:获取弱引用数
    getweakrefs:获取弱引用
  `],
  ['numbers', '数字类型', `
    Number:数字
    Complex:复数
    Real:实数
    Rational:有理数
    Integral:整数
  `],
  ['abc', '抽象基类', `
    ABC:抽象基类
    ABCMeta:抽象元类
    abstractmethod:抽象方法
    abstractclassmethod:抽象类方法
    abstractstaticmethod:抽象静态方法
    abstractproperty:抽象属性
    get_cache_token:获取缓存令牌
    update_abstractmethods:更新抽象方法
  `],
  ['cmath', '复数数学', `
    acos:反余弦
    acosh:反双曲余弦
    asin:反正弦
    asinh:反双曲正弦
    atan:反正切
    atanh:反双曲正切
    cos:余弦
    cosh:双曲余弦
    sin:正弦
    sinh:双曲正弦
    tan:正切
    tanh:双曲正切
    exp:指数
    log:对数
    log10:十对数
    sqrt:平方根
    phase:相位
    polar:极坐标
    rect:直角坐标
    isclose:接近相等
    isfinite:是有限数
    isinf:是无穷
    isnan:是空值
  `],
  ['getpass', '密码输入', `
    getpass:获取密码
    getuser:获取用户名
    GetPassWarning:密码警告
  `],
  ['configparser', '配置解析', `
    ConfigParser:配置解析器
    RawConfigParser:原始配置解析器
    SectionProxy:节代理
    ConverterMapping:转换器映射
    Error:错误
    NoSectionError:无节错误
    NoOptionError:无选项错误
    DuplicateSectionError:重复节错误
    DuplicateOptionError:重复选项错误
    MissingSectionHeaderError:缺少节头错误
    ParsingError:解析错误
    InterpolationError:插值错误
    InterpolationMissingOptionError:插值缺选项错误
    InterpolationSyntaxError:插值语法错误
    InterpolationDepthError:插值深度错误
    BasicInterpolation:基础插值
    ExtendedInterpolation:扩展插值
    InvalidWriteError:无效写入错误
    UnnamedSectionDisabledError:无名节禁用错误
  `],
  ['smtplib', '邮件发送', `
    SMTP:邮件客户端
    SMTP_SSL:安全邮件客户端
    LMTP:本地邮件客户端
    SMTPException:邮件错误
    SMTPAuthenticationError:认证错误
    SMTPConnectError:连接错误
    SMTPDataError:数据错误
    SMTPHeloError:问候错误
    SMTPNotSupportedError:不支持错误
    SMTPRecipientsRefused:收件人被拒
    SMTPResponseException:响应错误
    SMTPSenderRefused:发件人被拒
    SMTPServerDisconnected:服务断开
    quoteaddr:引用地址
    quotedata:引用数据
    encode_base64:编码摘要
  `],
  ['tomllib', '配置文档', `
    load:读取
    loads:读取文本
    TOMLDecodeError:解码错误
  `],
  ['mimetypes', '媒体类型', `
    MimeTypes:媒体类型库
    guess_type:猜测类型
    guess_all_extensions:猜测全部扩展名
    guess_extension:猜测扩展名
    guess_file_type:猜测文件类型
    add_type:添加类型
    init:初始化
    read_mime_types:读取类型表
  `],
];

// 第三轮补充：剩余有价值的公开成员（不含框架转导出的类型/内部辅助）
const PY_STDLIB3 = [
  ['os', '操作系统', `
    abort:中止
    add_dll_directory:添加动态库目录
    execl:执行加载
    execle:执行加载环境
    execlp:执行加载路径
    execlpe:执行加载路径环境
    execv:执行向量
    execve:执行向量环境
    execvp:执行向量路径
    execvpe:执行向量路径环境
    fchmod:修改描述符权限
    process_cpu_count:进程处理器数
    putenv:设置环境变量
  `],
  ['re', '正则', `
    PatternError:模式错误
  `],
  ['functools', '函数工具', `
    namedtuple:命名元组
  `],
  ['asyncio', '异步库', `
    AbstractEventLoop:抽象事件循环
    BaseEventLoop:基础事件循环
    EventLoop:事件循环
    SelectorEventLoop:选择器事件循环
    ProactorEventLoop:完成端口事件循环
    Handle:句柄
    TimerHandle:定时句柄
    LifoQueue:后进先出队列
    PriorityQueue:优先队列
    QueueShutDown:队列已关闭
    Protocol:协议
    BaseProtocol:基础协议
    BufferedProtocol:缓冲协议
    DatagramProtocol:数据报协议
    SubprocessProtocol:子进程协议
    StreamReaderProtocol:流读取协议
    Transport:传输
    BaseTransport:基础传输
    ReadTransport:读传输
    WriteTransport:写传输
    DatagramTransport:数据报传输
    SubprocessTransport:子进程传输
    AbstractServer:抽象服务
    SendfileNotAvailableError:发送文件不可用错误
    capture_call_graph:捕获调用图
    format_call_graph:格式化调用图
    print_call_graph:打印调用图
    create_eager_task_factory:创建急切任务工厂
    eager_task_factory:急切任务工厂
    future_add_to_awaited_by:添加等待关系
    future_discard_from_awaited_by:移除等待关系
  `],
  ['threading', '线程', `
    ExceptHookArgs:异常钩子参数
    WeakSet:弱集合
  `],
  ['typing', '类型提示', `
    OrderedDict:有序字典类型
    defaultdict:默认字典类
    TypeAliasType:别名类型对象
    clear_overloads:清除重载
    evaluate_forward_ref:求值前向引用
  `],
  ['logging', '日志', `
    PercentStyle:百分比样式
    StrFormatStyle:格式化样式
    StringTemplateStyle:模板样式
    Template:模板
  `],
  ['socket', '套接字', `
    SocketIO:套接字流
    close:关闭
    dup:复制
    IntEnum:整数枚举
    IntFlag:整数标志
  `],
  ['enum', '枚举库', `
    EnumType:枚举类型
    bin:枚举二进制
  `],
  ['zipfile', '压缩文件', `
    BadZipfile:损坏压缩文件旧名
    CompleteDirs:完整目录
    error:压缩错误
    main:命令行入口
  `],
  ['pprint', '美化打印', `
    pp:美化打印短名
  `],
  ['decimal', '十进制', `
    DecimalTuple:十进制元组
    IEEEContext:电气电子上下文
  `],
  ['calendar', '日历', `
    prweek:打印周
    calendar:月历文本
    error:日历错误
    repeat:重复
    global_enum:全局枚举
  `],
  ['inspect', '内省', `
    getargs:获取参数旧
    getargvalues:获取参数值旧
    formatannotationrelativeto:格式化注解相对
    Format:格式
  `],
  ['operator', '运算符', `
    eq:相等
    ne:不等
    lt:小于
    le:小于等于
    gt:大于
    ge:大于等于
    not_:逻辑非
    index:索引转换
    is_none:是空
    is_not_none:非空
  `],
  ['getpass', '密码输入', `
    unix_getpass:类统一获取密码
    win_getpass:视窗获取密码
    fallback_getpass:回退获取密码
  `],
  ['configparser', '配置解析', `
    Interpolation:插值基类
    MultilineContinuationError:多行续行错误
  `],
];

const PY_DS = [
  ['numpy', '数值计算', `
    array:数组
    arange:范围数组
    linspace:线性分割
    zeros:零数组
    ones:一数组
    empty:空数组
    full:填充数组
    eye:单位矩阵
    sum:求和
    mean:平均值
    std:标准差
    var:方差
    max:最大
    min:最小
    argmax:最大索引
    argmin:最小索引
    dot:点积
    matmul:矩阵乘
    transpose:转置
    reshape:重塑
    concatenate:连接
    stack:堆叠
    split:分割
    sort:排序
    argsort:排序索引
    where:条件选取
    unique:去重
    clip:裁剪
    round:四舍五入
    abs:绝对值
    sqrt:平方根
    exp:指数
    log:对数
    sin:正弦
    cos:余弦
    pi:圆周率
    nan:空值
    inf:无穷
    isnan:是空值
    isinf:是无穷
    meshgrid:网格
    random:随机
    random.random:随机.随机数
    random.rand:随机.随机数组
    random.randn:随机.正态数组
    random.randint:随机.随机整数
    random.choice:随机.选择
    random.seed:随机.种子
    random.shuffle:随机.洗牌
    linalg:线性代数
    linalg.norm:线性代数.范数
    linalg.inv:线性代数.逆矩阵
    linalg.det:线性代数.行列式
    linalg.solve:线性代数.求解
    linalg.eig:线性代数.特征值
  `],
  ['np', '数值', `
    array:数组
    arange:范围数组
    linspace:线性分割
    zeros:零数组
    ones:一数组
    empty:空数组
    full:填充数组
    eye:单位矩阵
    sum:求和
    mean:平均值
    std:标准差
    var:方差
    max:最大
    min:最小
    argmax:最大索引
    argmin:最小索引
    dot:点积
    matmul:矩阵乘
    transpose:转置
    reshape:重塑
    concatenate:连接
    stack:堆叠
    split:分割
    sort:排序
    argsort:排序索引
    where:条件选取
    unique:去重
    clip:裁剪
    round:四舍五入
    abs:绝对值
    sqrt:平方根
    exp:指数
    log:对数
    sin:正弦
    cos:余弦
    pi:圆周率
    nan:空值
    inf:无穷
    isnan:是空值
    isinf:是无穷
    meshgrid:网格
    random:随机
    random.random:随机.随机数
    random.rand:随机.随机数组
    random.randn:随机.正态数组
    random.randint:随机.随机整数
    random.choice:随机.选择
    random.seed:随机.种子
    random.shuffle:随机.洗牌
    linalg:线性代数
    linalg.norm:线性代数.范数
    linalg.inv:线性代数.逆矩阵
    linalg.det:线性代数.行列式
    linalg.solve:线性代数.求解
    linalg.eig:线性代数.特征值
  `],
  ['pandas', '数据分析', `
    DataFrame:数据框
    Series:序列
    read_csv:读取逗号分隔文件
    read_excel:读取表格文件
    read_table:读取制表文件
    concat:连接
    merge:合并
    pivot_table:透视表
    melt:融合
    cut:分箱
    qcut:分位分箱
    get_dummies:独热编码
    isnull:是空
    notnull:非空
    to_datetime:转为日期
    to_numeric:转为数值
    date_range:日期范围
  `],
  ['pd', '表格', `
    DataFrame:数据框
    Series:序列
    read_csv:读取逗号分隔文件
    read_excel:读取表格文件
    read_table:读取制表文件
    concat:连接
    merge:合并
    pivot_table:透视表
    melt:融合
    cut:分箱
    qcut:分位分箱
    get_dummies:独热编码
    isnull:是空
    notnull:非空
    to_datetime:转为日期
    to_numeric:转为数值
    date_range:日期范围
  `],
  ['matplotlib', '绘图库', `
    pyplot:绘图
    pyplot.plot:绘图.画线
    pyplot.scatter:绘图.散点
    pyplot.bar:绘图.柱状
    pyplot.barh:绘图.横向柱状
    pyplot.hist:绘图.直方图
    pyplot.pie:绘图.饼图
    pyplot.imshow:绘图.显示图像
    pyplot.figure:绘图.创建图
    pyplot.subplot:绘图.子图
    pyplot.subplots:绘图.多子图
    pyplot.title:绘图.标题
    pyplot.xlabel:绘图.横轴标签
    pyplot.ylabel:绘图.纵轴标签
    pyplot.legend:绘图.图例
    pyplot.xlim:绘图.横轴范围
    pyplot.ylim:绘图.纵轴范围
    pyplot.grid:绘图.网格
    pyplot.show:绘图.显示
    pyplot.savefig:绘图.保存图片
    pyplot.close:绘图.关闭
    pyplot.colorbar:绘图.颜色条
    pyplot.tight_layout:绘图.紧凑布局
    pyplot.annotate:绘图.注释
    pyplot.xticks:绘图.横轴刻度
    pyplot.yticks:绘图.纵轴刻度
    pyplot.suptitle:绘图.总标题
    pyplot.contour:绘图.等高线
    pyplot.contourf:绘图.填充等高线
    pyplot.boxplot:绘图.箱线图
    pyplot.errorbar:绘图.误差线
    pyplot.fill_between:绘图.带内填充
  `],
  ['plt', '图表', `
    plot:画线
    scatter:散点
    bar:柱状
    barh:横向柱状
    hist:直方图
    pie:饼图
    imshow:显示图像
    figure:创建图
    subplot:子图
    subplots:多子图
    title:标题
    xlabel:横轴标签
    ylabel:纵轴标签
    legend:图例
    xlim:横轴范围
    ylim:纵轴范围
    grid:网格
    show:显示
    savefig:保存图片
    close:关闭
    colorbar:颜色条
    tight_layout:紧凑布局
    annotate:注释
    xticks:横轴刻度
    yticks:纵轴刻度
    suptitle:总标题
    contour:等高线
    contourf:填充等高线
    boxplot:箱线图
    errorbar:误差线
  `],
  ['seaborn', '统计绘图', `
    set_theme:设置主题
    heatmap:热力图
    pairplot:成对图
    scatterplot:散点图
    lineplot:折线图
    barplot:柱状图
    histplot:直方图
    boxplot:箱线图
    violinplot:小提琴图
    countplot:计数图
    lmplot:线性模型图
    catplot:分类图
    relplot:关系图
    clustermap:聚类热图
    load_dataset:加载数据集
  `],
  ['sns', '统计图', `
    set_theme:设置主题
    heatmap:热力图
    pairplot:成对图
    scatterplot:散点图
    lineplot:折线图
    barplot:柱状图
    histplot:直方图
    boxplot:箱线图
    violinplot:小提琴图
    countplot:计数图
    lmplot:线性模型图
    catplot:分类图
    relplot:关系图
    clustermap:聚类热图
    load_dataset:加载数据集
  `],
  ['scipy', '科学计算', `
    stats:统计
    optimize:优化
    integrate:积分
    interpolate:插值
    signal:信号
  `],
];

const PY_ML = [
  ['torch', '张量库', `
    tensor:张量
    zeros:零张量
    ones:一张量
    randn:正态随机张量
    rand:随机张量
    arange:范围张量
    from_numpy:从数值数组
    cat:拼接
    stack:堆叠
    mm:矩阵乘
    matmul:批量矩阵乘
    sum:求和
    mean:平均值
    softmax:归一指数
    sigmoid:乙状
    relu:线性整流
    max:最大
    argmax:最大索引
    save:保存
    load:加载
    cuda:显卡
    device:设备
    no_grad:无梯度
    manual_seed:手动种子
    FloatTensor:浮点张量
    nn:神经网络
    nn.Linear:神经网络.线性层
    nn.Conv2d:神经网络.二维卷积
    nn.ReLU:神经网络.线性整流层
    nn.MaxPool2d:神经网络.二维最大池化
    nn.Dropout:神经网络.丢弃
    nn.CrossEntropyLoss:神经网络.交叉熵损失
    nn.MSELoss:神经网络.均方误差损失
    nn.Module:神经网络.模块
    nn.Sequential:神经网络.顺序容器
    nn.BatchNorm2d:神经网络.二维批归一化
    nn.Embedding:神经网络.嵌入层
    nn.functional:神经网络.函数模块
    nn.functional.relu:神经网络.函数模块.线性整流
    nn.functional.softmax:神经网络.函数模块.归一指数
    nn.functional.cross_entropy:神经网络.函数模块.交叉熵
    optim:优化器
    optim.Adam:优化器.自适应矩估计
    optim.SGD:优化器.随机梯度下降
    utils:工具
    utils.data:工具.数据
    utils.data.DataLoader:工具.数据.数据加载器
    utils.data.Dataset:工具.数据.数据集
    utils.data.random_split:工具.数据.随机划分
  `],
  ['nn', '神经网络', `
    Linear:线性层
    Conv2d:二维卷积
    ReLU:线性整流层
    MaxPool2d:二维最大池化
    Dropout:丢弃
    CrossEntropyLoss:交叉熵损失
    MSELoss:均方误差损失
    Module:模块
    Sequential:顺序容器
    BatchNorm2d:二维批归一化
    Embedding:嵌入层
    functional:函数模块
    functional.relu:函数模块.线性整流
    functional.softmax:函数模块.归一指数
    functional.cross_entropy:函数模块.交叉熵
  `],
  ['tensorflow', '张量流库', `
    constant:常量张量
    Variable:变量张量
    zeros:零张量
    ones:一张量
    add:相加
    multiply:相乘
    matmul:矩阵乘
    reduce_mean:均值
    reduce_sum:求和
    argmax:最大索引
    reshape:重塑
    transpose:转置
    expand_dims:扩展维度
    squeeze:压缩维度
    cast:转换类型
    keras:高级接口
    keras.Sequential:高级接口.顺序模型
    keras.layers:高级接口.层
    keras.layers.Dense:高级接口.层.全连接层
    keras.layers.Conv2D:高级接口.层.二维卷积
    keras.layers.LSTM:高级接口.层.长短期记忆
    keras.Model:高级接口.模型
    random:随机
    random.normal:随机.正态
    random.uniform:随机.均匀
  `],
  ['tf', '张量流', `
    constant:常量张量
    Variable:变量张量
    zeros:零张量
    ones:一张量
    add:相加
    multiply:相乘
    matmul:矩阵乘
    reduce_mean:均值
    reduce_sum:求和
    argmax:最大索引
    reshape:重塑
    transpose:转置
    expand_dims:扩展维度
    squeeze:压缩维度
    cast:转换类型
    keras:高级接口
    keras.Sequential:高级接口.顺序模型
    keras.layers:高级接口.层
    keras.layers.Dense:高级接口.层.全连接层
    keras.layers.Conv2D:高级接口.层.二维卷积
    keras.layers.LSTM:高级接口.层.长短期记忆
    keras.Model:高级接口.模型
    random:随机
    random.normal:随机.正态
    random.uniform:随机.均匀
  `],
  ['sklearn', '机器学习', `
    linear_model:线性模型
    linear_model.LinearRegression:线性模型.线性回归
    linear_model.LogisticRegression:线性模型.逻辑回归
    linear_model.Ridge:线性模型.岭回归
    linear_model.Lasso:线性模型.套索回归
    model_selection:模型选择
    model_selection.train_test_split:模型选择.训练测试划分
    model_selection.cross_val_score:模型选择.交叉验证得分
    model_selection.GridSearchCV:模型选择.网格搜索
    preprocessing:预处理
    preprocessing.StandardScaler:预处理.标准化器
    preprocessing.MinMaxScaler:预处理.最小最大缩放
    preprocessing.LabelEncoder:预处理.标签编码器
    preprocessing.OneHotEncoder:预处理.独热编码器
    metrics:度量
    metrics.accuracy_score:度量.准确率
    metrics.confusion_matrix:度量.混淆矩阵
    metrics.classification_report:度量.分类报告
    metrics.mean_squared_error:度量.均方误差
    metrics.r2_score:度量.决定系数
    ensemble:集成
    ensemble.RandomForestClassifier:集成.随机森林分类器
    ensemble.RandomForestRegressor:集成.随机森林回归器
    ensemble.GradientBoostingClassifier:集成.梯度提升分类器
    cluster:聚类
    cluster.KMeans:聚类.均值聚类
    cluster.DBSCAN:聚类.密度聚类
    datasets:数据集
    datasets.load_iris:数据集.加载鸢尾花
    datasets.make_classification:数据集.生成分类数据
  `],
  ['transformers', '变换器库', `
    pipeline:流水线
    AutoTokenizer:自动分词器
    AutoModel:自动模型
    AutoModelForSequenceClassification:序列分类模型
    Trainer:训练器
    TrainingArguments:训练参数
  `],
  ['cv2', '视觉库', `
    imread:读取图像
    imwrite:写入图像
    imshow:显示图像
    resize:缩放
    cvtColor:颜色转换
    VideoCapture:视频捕获
    rectangle:画矩形
    circle:画圆
    putText:写文字
    threshold:阈值
    findContours:查找轮廓
    GaussianBlur:高斯模糊
    waitKey:等待按键
    destroyAllWindows:销毁所有窗口
  `],
  ['Image', '图像', `
    open:打开图像
    save:保存图像
    resize:缩放图像
    crop:裁剪
    convert:转换
  `],
];

const PY_WEB = [
  ['requests', '请求库', `
    get:获取
    post:提交
    put:放置
    delete:删除
    patch:补丁
    head:头部
    Session:会话
    session:会话对象
  `],
  ['bs4', '解析库', `
    BeautifulSoup:解析器
    find:查找
    find_all:查找全部
    select:选择
    get_text:获取文本
  `],
  ['flask', '网页框架', `
    Flask:应用
    route:路由
    run:运行
    request:请求对象
    jsonify:转为结构文本
    render_template:渲染模板
    redirect:重定向
    url_for:生成地址
    abort:中止
  `],
  ['django', '大网页框架', `
    http:请求响应
    http.HttpResponse:请求响应.响应
    http.JsonResponse:请求响应.结构响应
    http.HttpRequest:请求响应.请求
    shortcuts:快捷方式
    shortcuts.render:快捷方式.渲染
    shortcuts.redirect:快捷方式.重定向
    shortcuts.get_object_or_404:快捷方式.获取或空
    db:数据库
    db.models:数据库.模型
    db.models.Model:数据库.模型.模型基类
    db.models.CharField:数据库.模型.字符字段
    db.models.IntegerField:数据库.模型.整数字段
    db.models.DateTimeField:数据库.模型.日期时间字段
    db.models.ForeignKey:数据库.模型.外键
    db.models.ManyToManyField:数据库.模型.多对多字段
    db.models.QuerySet:数据库.模型.查询集
    urls:地址配置
    urls.path:地址配置.路径
    urls.include:地址配置.包含
  `],
  ['fastapi', '快速接口', `
    FastAPI:应用
    get:获取
    post:提交
    HTTPException:请求异常
    Depends:依赖
  `],
  ['pydantic', '数据校验', `
    BaseModel:基础模型
    Field:字段
    validator:校验器
  `],
  ['sqlalchemy', '数据库工具', `
    create_engine:创建引擎
    Column:列
    Integer:整数字段
    String:字符串字段
    sessionmaker:会话工厂
    declarative_base:声明基类
  `],
];

// ============================================================
// 组装
// ============================================================

const RAW_GROUPS = [
  { id: 'js', label: 'JavaScript 核心', short: 'JS', langs: ['javascript', 'typescript'], roots: JS_CORE },
  { id: 'js-methods', label: 'JavaScript 常用方法', short: 'JS', langs: ['javascript', 'typescript'], roots: JS_METHODS },
  { id: 'js-dom', label: '浏览器与 DOM', short: 'DOM', langs: ['javascript', 'typescript'], roots: JS_DOM },
  { id: 'js-node', label: 'Node.js 运行时', short: 'NODE', langs: ['javascript', 'typescript'], roots: JS_NODE },
  { id: 'js-web', label: '前端框架与常用库', short: 'WEB', langs: ['javascript', 'typescript'], roots: JS_WEB },
  { id: 'js-ts', label: 'TypeScript 工具类型', short: 'TS', langs: ['typescript'], roots: JS_TS },
  { id: 'py', label: 'Python 内置函数', short: 'PY', langs: ['python'], roots: PY_BUILTIN },
  { id: 'py-stdlib', label: 'Python 标准库', short: 'PY', langs: ['python'], roots: [...PY_STDLIB, ...PY_STDLIB2, ...PY_STDLIB3] },
  { id: 'py-ds', label: 'Python 数据分析', short: 'DS', langs: ['python'], roots: PY_DS },
  { id: 'py-ml', label: 'Python 机器学习', short: 'ML', langs: ['python'], roots: PY_ML },
  { id: 'py-web', label: 'Python Web 与工具', short: 'WEB', langs: ['python'], roots: PY_WEB },
];

export const BUILTIN_GROUPS = RAW_GROUPS.map(g => ({ ...g, items: buildItems(g.roots) }));

/**
 * 同一语言内「中文别名 ↔ 英文键」必须一一对应，否则反向还原会串味。
 * 这里做一次全局裁决：后出现的冲突条目直接丢弃，并记录到 MAP_CONFLICTS。
 */
export const MAP_CONFLICTS = [];

(function resolveConflicts() {
  const nsByLang = new Map();
  const nsOf = (lang) => {
    if (!nsByLang.has(lang)) nsByLang.set(lang, { en: new Map(), cn: new Map() });
    return nsByLang.get(lang);
  };
  for (const g of BUILTIN_GROUPS) {
    const keep = [];
    for (const [en, cn] of g.items) {
      let ok = true;
      for (const lang of g.langs) {
        const ns = nsOf(lang);
        if (ns.cn.has(cn) && ns.cn.get(cn) !== en) ok = false;
        if (ns.en.has(en) && ns.en.get(en) !== cn) ok = false;
        if (!ok) break;
      }
      if (!ok) {
        MAP_CONFLICTS.push({ group: g.id, en, cn, langs: g.langs.join('/') });
        continue;
      }
      for (const lang of g.langs) {
        const ns = nsOf(lang);
        ns.cn.set(cn, en);
        ns.en.set(en, cn);
      }
      keep.push([en, cn]);
    }
    g.items = keep;
  }
})();

if (MAP_CONFLICTS.length) {
  console.warn('[cnview] 内置映射冲突 ' + MAP_CONFLICTS.length + ' 条：',
    MAP_CONFLICTS.slice(0, 20));
}

/** 某语言的合并内置别名（含前缀与完整链） */
export function builtinFor(lang) {
  const out = [];
  for (const g of BUILTIN_GROUPS) if (g.langs.includes(lang)) out.push(...g.items);
  return out;
}

export function builtinTotal() {
  return BUILTIN_GROUPS.reduce((n, g) => n + g.items.length, 0);
}
