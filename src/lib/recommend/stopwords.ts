/**
 * Vietnamese + English stopwords and junk token blacklist.
 * These tokens MUST NEVER appear as matched skill tags.
 */

/** Common Vietnamese stopwords (no diacritics). */
export const VN_STOPWORDS: string[] = [
  // Pronouns / determiners
  "toi", "ban", "anh", "chi", "em", "minh", "ho", "chung", "ta", "no",
  "cua", "cho", "voi", "cac", "moi", "nhung", "mot", "hai", "ba", "bon",
  "nam", "sau", "bay", "tam", "chin", "muoi",
  // Verbs / aux
  "la", "co", "khong", "duoc", "dang", "se", "da", "di", "den", "ra",
  "vao", "len", "xuong", "lam", "biet", "can", "nen", "phai", "muon",
  "thay", "nghi", "noi", "hoi", "tra", "tim", "giu", "dat",
  // Conjunctions / prepositions
  "va", "hoac", "nhung", "ma", "vi", "nen", "de", "khi", "neu", "thi",
  "doi", "theo", "tu", "tren", "duoi", "trong", "ngoai", "truoc", "qua",
  "ben", "giua", "gan", "xa",
  // Adverbs / misc
  "rat", "lam", "nhat", "hon", "nhu", "vay", "the", "nay", "do", "kia",
  "day", "roi", "cung", "lai", "nua", "luon", "con", "het", "khong",
  "deu", "bao", "gio", "luc", "nao", "dau",
  // Common in job descriptions
  "cong", "ty", "viec", "lam", "nhan", "vien", "chuyen", "ky", "nang",
  "kinh", "nghiem", "yeu", "cau", "ung", "tuyen", "tuyen", "dung",
  "luong", "bao", "hiem", "quyen", "loi", "moi", "truong", "dao", "tao",
  "phat", "trien", "quan", "ly", "dieu", "hanh", "phong", "ban",
  "to", "chuc", "he", "thong", "du", "an", "van", "phong",
  "thong", "tin", "lien", "he", "dia", "chi", "dien", "thoai",
  "ngay", "thang", "nam", "gio", "phut", "giay",
  "tot", "xau", "dep", "cao", "thap", "lon", "nho", "nhieu", "it",
  "mau", "tra", "xem", "gui", "nhan", "hoc", "giao", "duc",
  "truong", "hoc", "dai", "cao", "dang", "trung", "cap",
  "tap", "su", "doan", "hang", "san", "xuat", "dich", "vu",
  "khach", "hang", "ban", "mua", "gia", "tri", "chat", "luong",
  "tieu", "chuan", "quy", "trinh", "chinh", "sach",
  "nganh", "nghe", "linh", "vuc", "cap", "bac",
  // Context junk
  "tai", "thanh", "pho", "tinh", "huyen", "quan", "xa", "phuong",
  "toan", "quoc", "khu", "vuc",
];

/** Common English stopwords */
export const EN_STOPWORDS: string[] = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get",
  "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your",
  "good", "some", "could", "them", "see", "other", "than", "then",
  "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first",
  "well", "way", "even", "new", "want", "because", "any", "these",
  "give", "day", "most", "us", "are", "has", "was", "been", "had",
  "is", "am", "were", "did", "does", "being", "having",
  // Job posting English noise
  "required", "preferred", "minimum", "maximum", "years", "experience",
  "ability", "skills", "knowledge", "strong", "excellent", "good",
  "working", "team", "environment", "company", "position", "role",
  "responsible", "requirements", "benefits", "salary",
];

/**
 * Junk tokens that are NEVER valid skill/keyword tags.
 * These are Vietnamese syllable fragments that the tokenizer might produce
 * from splitting multi-word terms.
 */
export const JUNK_TOKENS: string[] = [
  // Location fragments (ASCII-ified)
  "chi", "minh", "noi", "nang", "phong", "hoa",
  "hcm", "tphcm", "hn", "sg",
  // Single Vietnamese syllables that are meaningless alone
  "van", "nang", "cong", "nghe", "vien", "ky", "thu", "su",
  "phan", "mem", "cung", "mang", "dien", "lanh", "dau",
  "khi", "xay", "dung", "bao", "tri", "sua", "chua",
  "ung", "vien", "tuyen", "sinh", "dao", "tao",
  "kinh", "doanh", "ban", "hang", "tai", "chinh",
  "ngan", "hang", "bat", "dong", "san",
  "ke", "toan", "kiem", "toan", "luat", "phap",
  "tien", "luong", "bao", "hiem", "quyen", "loi",
  "nhan", "vien", "chuyen", "truong", "nhom", "pho",
  "giam", "doc", "quan", "doi",
  // Common meaningless fragments
  "yeu", "cau", "tot", "nghiep", "trinh", "do",
  "hien", "nay", "hoc", "tap", "cac", "nhung", "mot",
  "cua", "cho", "voi", "duoc", "khong", "trong",
  "mac", "dinh", "hieu", "biet", "tham", "gia",
];
