"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceUnit: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
}

const creditPackages = [
  { 
    id: "starter", 
    name: "Starter", 
    credits: 50, 
    price: 4.99, 
    features: ["50 积分", "适合偶尔使用", "永久有效"],
    isPopular: false,
  },
  { 
    id: "popular", 
    name: "Popular", 
    credits: 150, 
    price: 12.99, 
    features: ["150 积分", "适合日常使用", "永久有效", "额外送10积分"],
    isPopular: true,
  },
  { 
    id: "pro", 
    name: "Pro", 
    credits: 500, 
    price: 29.99, 
    features: ["500 积分", "适合商业使用", "永久有效", "额外送50积分"],
    isPopular: false,
  },
];

const subscriptionPlans = [
  {
    id: "basic",
    name: "Basic",
    price: 9.99,
    priceUnit: "/月",
    features: [
      "每日 50 次处理",
      "优先处理队列",
      "Email 支持",
    ],
    buttonText: "立即订阅",
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    priceUnit: "/月",
    features: [
      "无限次处理",
      "最高优先级",
      "7x24 客服支持",
      "无广告",
      "API 访问权限",
    ],
    isPopular: true,
    buttonText: "立即订阅",
  },
];

const faqItems = [
  {
    question: "积分会过期吗？",
    answer: "积分永久有效，可随时使用。订阅用户的每日免费次数仅当日有效。"
  },
  {
    question: "可以取消订阅吗？",
    answer: "可以随时取消，取消后套餐有效期至到期日，到期后自动降级为免费版。"
  },
  {
    question: "如何支付？",
    answer: "支持 PayPal、微信、支付宝等主流支付方式。"
  },
  {
    question: "处理失败会扣次数吗？",
    answer: "不会。只有成功处理的图片才会扣除次数或积分。"
  },
  {
    question: "免费版可以做什么？",
    answer: "每日可免费处理 10 张图片，注册即送 3 积分。积分用完后仍可使用每日免费次数。"
  },
  {
    question: "支持批量处理吗？",
    answer: "Pro 订阅用户支持 API 批量调用，具体请联系客服。"
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"credits" | "subscription">("credits");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image BG Remover</h1>
            <p className="text-sm text-gray-500">AI-powered background removal</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← 返回
            </button>
            {user?.user ? (
              <button
                onClick={() => router.push("/profile")}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                个人中心
              </button>
            ) : (
              <button
                onClick={() => router.push("/api/auth/google")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">选择适合您的方案</h2>
          <p className="text-lg text-gray-600">
            按需选择积分包或订阅计划（美元定价）
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl p-1 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab("credits")}
              className={`px-8 py-3 rounded-lg font-medium transition-all ${
                activeTab === "credits"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              💎 积分包
            </button>
            <button
              onClick={() => setActiveTab("subscription")}
              className={`px-8 py-3 rounded-lg font-medium transition-all ${
                activeTab === "subscription"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📅 订阅计划
            </button>
          </div>
        </div>

        {/* 积分包 */}
        {activeTab === "credits" && (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col ${
                  pkg.isPopular ? "ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}
              >
                {pkg.isPopular && (
                  <div className="bg-blue-500 text-white text-center py-1 px-4 rounded-full text-sm font-medium -mx-6 -mt-6 mb-4">
                    最受欢迎
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">${pkg.price}</span>
                </div>
                
                <ul className="space-y-2 mb-6 flex-grow">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600 text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  className="w-full py-3 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Payment coming soon
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 订阅计划 */}
        {activeTab === "subscription" && (
          <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-lg p-8 flex flex-col ${
                  plan.isPopular ? "ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}
              >
                {plan.isPopular && (
                  <div className="bg-blue-500 text-white text-center py-1 px-4 rounded-full text-sm font-medium -mx-8 -mt-8 mb-4">
                    最受欢迎
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">{plan.priceUnit}</span>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Payment coming soon
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FAQ 手风琴 */}
        <div className="max-w-2xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">❓ 常见问题</h3>
          
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center"
                >
                  <span className="font-medium text-gray-900">{item.question}</span>
                  <span className={`text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Try for free */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">想要先体验一下？</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try for free
          </button>
        </div>

        {/* 底部说明 */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>💡 每次去背景 API 调用成本约 $0.01，我们承诺不随意涨价</p>
          <p className="mt-2">© 2026 Image BG Remover</p>
        </div>
      </main>
    </div>
  );
}