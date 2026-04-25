-- =====================================================
-- SEED: Sample Resume Data cho template "F8 Green Modern"
-- Nội dung từ hình CV mẫu (Nguyen Van A - Fullstack Developer)
-- =====================================================
-- Lưu ý: File này chỉ để tham khảo cấu trúc resume_data.
-- Để insert thực tế, bạn cần thay user_id bằng UUID thật.
-- =====================================================

-- Xem resume_data mẫu ở dưới (không chạy INSERT vì cần user_id thật)
-- Bỏ comment dòng INSERT nếu muốn seed với user cụ thể.

/*
INSERT INTO public.resumes (user_id, template_id, title, resume_data, current_styling)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- ← thay bằng user_id thật
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- FK → template F8 Green Modern
  'CV Nguyen Van A - Fullstack Developer',
  -- resume_data (nội dung đầy đủ từ 3 trang CV mẫu)
*/

-- =====================================================
-- REFERENCE: resume_data JSON (cho frontend / testing)
-- Copy JSON này vào Supabase Dashboard hoặc dùng API
-- =====================================================

-- resume_data:
/*
[
  {
    "block_id": "header",
    "is_visible": true,
    "data": {
      "fullName": "Nguyen Van A",
      "title": "Fullstack developer",
      "avatarUrl": null
    }
  },
  {
    "block_id": "contact",
    "is_visible": true,
    "data": {
      "fullName": "Nguyen Van A",
      "dob": "01/01/2000",
      "phone": "+84 1234567890",
      "email": "nguyenvana@gmail.com",
      "address": "Ha Noi, Viet Nam"
    }
  },
  {
    "block_id": "summary",
    "is_visible": true,
    "data": {
      "content": "<ul><li>Over <strong>2 years of experience</strong> in programming with good communication and quick learning skills</li><li>Strengths: Front-end technology and Back-end web application development</li><li>Proficiency in HTML, CSS, JavaScript</li><li>Strong proficiency in JavaScript, including DOM manipulation and the JavaScript object model</li><li>Thorough understanding of React.js and its core principles</li><li>Experience with popular React.js workflows (such as Flux or Redux)</li><li>Familiarity with newer specifications of EcmaScript</li><li>Experience with data structure libraries</li><li>Familiarity with RESTful APIs</li><li>Strong Experience in: PHP, JavaScript (ReactJS, React-native), MySQL, NoSQL, GraphQL, Redis, JSON, API, Docker, Kubernetes, Rancher, AWS services</li><li>Proficient use of source code management tools: SVN, GIT</li><li>Proficiency in operating systems: Linux (Ubuntu, OSX), Windows</li><li>Ability to learn and apply new technology quickly</li><li>Current working location: Ha Noi, Viet Nam</li></ul>"
    }
  },
  {
    "block_id": "experience",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "exp-001",
          "company": "F8 TECHNOLOGY EDUCATION.,JSC",
          "position": "Full-stack Developer",
          "startDate": "2018-01",
          "endDate": null,
          "isCurrent": true,
          "description": "<ul><li>Programme outsourcing projects</li><li>Create coding frames and design database based on project descriptions</li></ul>"
        },
        {
          "id": "exp-002",
          "company": "AI&T JSC",
          "position": "Full-stack Developer",
          "startDate": "2015-07",
          "endDate": "2018-03",
          "isCurrent": false,
          "description": "<ul><li>Programme outsourcing projects</li><li>Create coding frames and design database based on project descriptions</li></ul>"
        },
        {
          "id": "exp-003",
          "company": "FREELANCER",
          "position": "Full-stack Developer",
          "startDate": "2015-01",
          "endDate": "2015-07",
          "isCurrent": false,
          "description": "<ul><li>Develop web module on given projects.</li></ul>"
        }
      ]
    }
  },
  {
    "block_id": "education",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "edu-001",
          "institution": "FPT Polytechnic",
          "degree": "Website, Mobile Programming",
          "gpa": "Good",
          "startDate": "2011",
          "endDate": "2014"
        }
      ]
    }
  },
  {
    "block_id": "skills",
    "is_visible": true,
    "data": {
      "items": [
        { "id": "sk-01", "category": "Main", "name": "HTML, CSS, JavaScript (ReactJS, React-Native, Lit)", "level": "Expert" },
        { "id": "sk-02", "category": "Main", "name": "PHP (Laravel, Symfony, Codeigniter, Yii)", "level": "Expert" },
        { "id": "sk-03", "category": "Main", "name": "Node (ExpressJS)", "level": "Advanced" },
        { "id": "sk-04", "category": "Main", "name": "RESTful API, GraphQL", "level": "Advanced" },
        { "id": "sk-05", "category": "Main", "name": "MySQL, PostgreSQL, NoSQL (MongoDB)", "level": "Advanced" },
        { "id": "sk-06", "category": "Main", "name": "Server (Apache, Nginx, Redis, Memcached, Queue, Log, Cronjob...), Rancher, K8S, Docker", "level": "Advanced" },
        { "id": "sk-07", "category": "Main", "name": "AWS (Load balancing, EC2, ECS, Router 53, RDS, S3)", "level": "Intermediate" },
        { "id": "sk-08", "category": "Other", "name": "Ruby (Ruby on Rails)", "level": "Intermediate" },
        { "id": "sk-09", "category": "Other", "name": "SVN, Git", "level": "Advanced" },
        { "id": "sk-10", "category": "Other", "name": "Python (Selenium automation test, crawler)", "level": "Intermediate" },
        { "id": "sk-11", "category": "Other", "name": "Elasticsearch", "level": "Intermediate" },
        { "id": "sk-12", "category": "Other", "name": "Tensorflow", "level": "Beginner" }
      ]
    }
  },
  {
    "block_id": "awards",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "aw-001",
          "title": "Poly Creative Competition 2016",
          "date": "2016-06",
          "issuer": "Poly Creative Competition 2016",
          "description": "1st place in 2 \"North - South - Central POLY & FE Creation\" contests. First prize. Poly creation contest: https://goo.gl/BVP5kE"
        },
        {
          "id": "aw-002",
          "title": "FE Creative Competition 2016",
          "date": "2016-08",
          "issuer": "FE Creative Competition 2016",
          "description": "FE creation contest: https://goo.gl/B6ULiw"
        },
        {
          "id": "aw-003",
          "title": "AI&T JSC Employee Award",
          "date": "2016-02",
          "issuer": "AI&T JSC",
          "description": "Employee Award"
        }
      ]
    }
  },
  {
    "block_id": "projects",
    "is_visible": true,
    "data": {
      "items": [
        {
          "id": "proj-001",
          "name": "FULLSTACK.EDU.VN",
          "startDate": "2019-01",
          "endDate": null,
          "customer": "F8 TECHNOLOGY EDUCATION.,JSC",
          "description": "Learn programming online (https://f8.edu.vn)",
          "teamSize": "1",
          "position": "Product Owner, BA, Developer, Tester, Video Editor",
          "responsibilities": "<ul><li>Developer</li><li>Solution architect</li></ul>",
          "technologies": "<ul><li>Frontend: ReactJS</li><li>Backend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3</li><li>Architecture: Microservice - Event driven (deploy with K8S), Websocket, SSO</li></ul>"
        },
        {
          "id": "proj-002",
          "name": "MYCV.VN",
          "startDate": "2018-06",
          "endDate": null,
          "customer": "MyCV JSC.",
          "description": "Standard CV writing application, always support free PDF download (https://mycv.vn)",
          "teamSize": "1",
          "position": "Developer",
          "responsibilities": "<ul><li>Developer</li><li>Solution architect</li></ul>",
          "technologies": "<ul><li>Frontend: ReactJS</li><li>Backend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3</li><li>Architecture: Microservice - Event driven (deploy with K8S), Websocket, SSO</li></ul>"
        },
        {
          "id": "proj-003",
          "name": "BOTAYRA.FULLSTACK.EDU.VN",
          "startDate": "2020-05",
          "endDate": "2020-06",
          "customer": "MyCV JSC.",
          "description": "Do Not Touch Your Face is a tool that helps you avoid touching your face using your webcam and machine learning (https://botayra.fullstack.edu.vn/).",
          "teamSize": "1",
          "position": "Developer",
          "responsibilities": "<ul><li>Developer</li></ul>",
          "technologies": "<ul><li>Frontend: ReactJS, Tensorflow</li></ul>"
        },
        {
          "id": "proj-004",
          "name": "FOODHUB.VN",
          "startDate": "2017-10",
          "endDate": "2018-01",
          "customer": "O'Green Food",
          "description": "App to connect organic food store chains. (https://www.foodhub.vn/)",
          "teamSize": "2",
          "position": "Full-stack developer",
          "responsibilities": "<ul><li>Build frontend</li><li>Build backend</li></ul>",
          "technologies": "<ul><li>Frontend: Web + App (React-Native)</li><li>Backend: PHP - Codeigniter, MariaDB, Memcached</li></ul>"
        },
        {
          "id": "proj-005",
          "name": "SIEU-DAO-CHICH GAME",
          "startDate": "2016-09",
          "endDate": "2016-12",
          "customer": "Personal project",
          "description": "Remote control online game via computer using IoT",
          "teamSize": "1",
          "position": "Developer",
          "responsibilities": "<ul><li>Build frontend</li><li>Build backend</li><li>Build hardware</li></ul>",
          "technologies": "<ul><li>Frontend: HTML, CSS, Jquery</li><li>Backend: PHP - Symfony, MariaDB, Memcached</li><li>Others: Raspberry Pi 2, 6 cameras IP & some sensors, other hardware devices</li></ul>"
        }
      ]
    }
  }
]
*/

-- =====================================================
-- Nếu bạn muốn test nhanh trên Supabase Dashboard,
-- dùng lệnh SQL dưới đây (thay YOUR_USER_ID):
-- =====================================================

-- INSERT INTO public.resumes (user_id, template_id, title, resume_data, current_styling)
-- VALUES (
--   'YOUR_USER_ID_HERE'::uuid,
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'CV Nguyen Van A - Fullstack Developer',
--   '<paste JSON ở trên vào đây>'::jsonb,
--   '{
--     "colors": { "primary": "#4CAF50", "secondary": "#388E3C", "text": "#333333", "background": "#FFFFFF" },
--     "fonts": { "heading": "Manrope", "body": "Manrope" },
--     "spacing": 4
--   }'::jsonb
-- );
