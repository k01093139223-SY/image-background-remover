/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => any;
    };
  }
}

const CREDIT_PACKAGES = [
  { 
    id: "starter", 
    name: "Starter", 
    credits: 50, 
    price: 4.99, 
    priceId: "P-2RJ23456A12345678",
    features: ["50 Credits", "Perfect for occasional use", "Permanent"],
    isPopular: false,
  },
  { 
    id: "popular", 
    name: "Popular", 
    credits: 150, 
    price: 12.99,
    priceId: "P-5AB23456A12345679", 
    features: ["150 Credits", "Ideal for daily use", "Permanent", "Extra 10 Credits"],
    isPopular: true,
  },
  { 
    id: "pro", 
    name: "Pro", 
    credits: 500, 
    price: 29.99,
    priceId: "P-8CD23456A12345680", 
    features: ["500 Credits", "Great for business", "Permanent", "Extra 50 Credits"],
    isPopular: false,
  },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 9.99,
    priceUnit: "/month",
    priceId: "P-2AB34567C89012345",
    features: [
      "50 daily requests",
      "Priority queue",
      "Email support",
    ],
    isPopular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    priceUnit: "/month",
    priceId: "P-5CD34567E89012346",
    features: [
      "Unlimited requests",
      "Highest priority",
      "7x24 priority support",
      "No ads",
      "API access",
    ],
    isPopular: true,
  },
];

const FAQ_ITEMS = [
  { question: "Do credits expire?", answer: "Credits are permanent and can be used anytime. Free daily quota resets every day." },
  { question: "Can I cancel my subscription?", answer: "You can cancel anytime. Your plan remains active until expiration, then automatically downgrades to free." },
  { question: "How to pay?", answer: "Supports PayPal and other major payment methods." },
  { question: "Does failed processing count towards quota?", answer: "No. Only successfully processed images count towards your quota." },
  { question: "What can the free plan do?", answer: "Free plan includes 10 images/day. New users get 3 credits. You can also use your daily free quota after credits run out." },
  { question: "Do you support batch processing?", answer: "Pro subscribers get API batch access. Contact support for details." },
];

const PAYPAL_CLIENT_ID = "ATlkCMuWeU99BRfOraUpjjpxk52N-HUFp9TpsPPhBhkF0lVRKDa9lgwmgBY4ltOsScJbxkyOCnVI-SuG";

export default function PricingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"credits" | "subscription">("credits");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const buttonsRendered = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Load PayPal SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    script.async = true;
    document.body.appendChild(script);

    fetch("/api/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {});
  }, []);

  // Render PayPal buttons when tab changes
  useEffect(() => {
    // Clear rendered state when tab changes so buttons can re-render
    buttonsRendered.current.clear();
    
    const timer = setTimeout(() => {
      if (activeTab === "credits") {
        renderCreditButtons();
      } else {
        renderSubscriptionButtons();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const renderCreditButtons = () => {
    CREDIT_PACKAGES.forEach((pkg) => {
      const containerId = `paypal-button-${pkg.id}`;
      const container = document.getElementById(containerId);
      
      if (container && container.children.length === 0 && !buttonsRendered.current.has(`credit-${pkg.id}`)) {
        buttonsRendered.current.add(`credit-${pkg.id}`);
        
        if (window.paypal) {
          window.paypal.Buttons({
            style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
            createOrder: async () => {
              const response = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productType: "credits",
                  packageId: pkg.id,
                  credits: pkg.credits,
                  price: pkg.price,
                  priceId: pkg.priceId,
                }),
              });
              const order = await response.json();
              return order.id;
            },
            onApprove: async (data: any) => {
              setProcessingPayment(pkg.id);
              const response = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID, productType: "credits", packageId: pkg.id }),
              });
              const result = await response.json();
              setProcessingPayment(null);
              if (result.success) {
                setPaymentSuccess(true);
                setTimeout(() => setPaymentSuccess(false), 3000);
              }
            },
            onError: () => {
              setProcessingPayment(null);
              alert("Payment failed. Please try again.");
            },
          }).render(`#${containerId}`);
        }
      }
    });
  };

  const renderSubscriptionButtons = () => {
    SUBSCRIPTION_PLANS.forEach((plan) => {
      const containerId = `paypal-sub-${plan.id}`;
      const container = document.getElementById(containerId);
      
      if (container && container.children.length === 0 && !buttonsRendered.current.has(`sub-${plan.id}`)) {
        buttonsRendered.current.add(`sub-${plan.id}`);
        
        if (window.paypal) {
          window.paypal.Buttons({
            style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
            createSubscription: async () => {
              const response = await fetch("/api/paypal/create-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productType: "subscription",
                  planId: plan.id,
                  planName: plan.name,
                  price: plan.price,
                  priceId: plan.priceId,
                }),
              });
              const sub = await response.json();
              return sub.id;
            },
            onApprove: async (data: any) => {
              setProcessingPayment(plan.id);
              const response = await fetch("/api/paypal/activate-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionId: data.subscriptionID, planId: plan.id }),
              });
              const result = await response.json();
              setProcessingPayment(null);
              if (result.success) {
                setPaymentSuccess(true);
                setTimeout(() => setPaymentSuccess(false), 3000);
              }
            },
            onError: () => {
              setProcessingPayment(null);
              alert("Subscription failed. Please try again.");
            },
          }).render(`#${containerId}`);
        }
      }
    });
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {paymentSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          ✅ Payment successful! Your credits have been added.
        </div>
      )}

      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image BG Remover</h1>
            <p className="text-sm text-gray-500">AI-powered background removal</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/")} className="px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
            {user?.user ? (
              <button onClick={() => router.push("/profile")} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">My Profile</button>
            ) : (
              <button onClick={() => router.push("/api/auth/google")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Login</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          <p className="text-lg text-gray-600">Select credit packs or subscription plans (USD pricing)</p>
          <p className="text-sm text-yellow-600 mt-2">🔒 Sandbox Mode - Test payments with PayPal</p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl p-1 shadow-sm inline-flex">
            <button onClick={() => setActiveTab("credits")} className={`px-8 py-3 rounded-lg font-medium transition-all ${activeTab === "credits" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
              💎 Credit Packs
            </button>
            <button onClick={() => setActiveTab("subscription")} className={`px-8 py-3 rounded-lg font-medium transition-all ${activeTab === "subscription" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
              📅 Subscription Plans
            </button>
          </div>
        </div>

        {activeTab === "credits" && (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {CREDIT_PACKAGES.map((pkg) => (
              <div key={pkg.id} className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col ${pkg.isPopular ? "ring-4 ring-blue-500 ring-opacity-50" : ""}`}>
                {pkg.isPopular && <div className="bg-blue-500 text-white text-center py-1 px-4 rounded-full text-sm font-medium -mx-6 -mt-6 mb-4">Most Popular</div>}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="mb-4"><span className="text-3xl font-bold text-gray-900">${pkg.price}</span></div>
                <ul className="space-y-2 mb-6 flex-grow">
                  {pkg.features.map((feature, i) => (<li key={i} className="flex items-center text-gray-600 text-sm"><span className="text-green-500 mr-2">✓</span>{feature}</li>))}
                </ul>
                <div id={`paypal-button-${pkg.id}`} className="min-h-10">
                  {processingPayment === pkg.id ? (
                    <div className="text-center text-sm text-gray-500">Processing...</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "subscription" && (
          <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id} className={`bg-white rounded-2xl shadow-lg p-8 flex flex-col ${plan.isPopular ? "ring-4 ring-blue-500 ring-opacity-50" : ""}`}>
                {plan.isPopular && <div className="bg-blue-500 text-white text-center py-1 px-4 rounded-full text-sm font-medium -mx-8 -mt-8 mb-4">Most Popular</div>}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6"><span className="text-4xl font-bold text-gray-900">${plan.price}</span><span className="text-gray-500">{plan.priceUnit}</span></div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (<li key={i} className="flex items-center text-gray-600"><span className="text-green-500 mr-2">✓</span>{feature}</li>))}
                </ul>
                <div id={`paypal-sub-${plan.id}`} className="min-h-10">
                  {processingPayment === plan.id ? (
                    <div className="text-center text-sm text-gray-500">Processing...</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-2xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">❓ FAQ</h3>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => toggleFaq(i)} className="w-full px-6 py-4 text-left flex justify-between items-center">
                  <span className="font-medium text-gray-900">{item.question}</span>
                  <span className={`text-gray-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && <div className="px-6 pb-4 text-gray-600">{item.answer}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">Want to try first?</p>
          <button onClick={() => router.push("/")} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Try for free</button>
        </div>

        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>💡 Each background removal API call costs ~$0.01, we promise no sudden price increases</p>
          <p className="mt-2">© 2026 Image BG Remover · All prices in USD · 🔒 Sandbox</p>
        </div>
      </main>
    </div>
  );
}