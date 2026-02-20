import React, { useState, ChangeEvent, useEffect } from 'react';
import { Users, Briefcase, MapPin, Heart, Search, MessageCircle, TrendingUp, Plus, X, Shield, Download, User, Edit2, Save, RefreshCw, Trash2 } from 'lucide-react';
import { Footer } from './src/Footer';
import {
  getStoredToken,
  setStoredToken,
  apiRegister,
  apiLogin,
  apiMe,
  apiMembers,
  apiUsers,
  apiDeleteUser,
  apiUpdateRole,
  apiForgotPassword,
  apiResetPassword,
  type UserProfile as ApiUserProfile,
  type RegisterBody,
} from './src/apiClient';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  chatworkId: string;
  sns1Type: string;
  sns1Account: string;
  sns2Type: string;
  sns2Account: string;
  sns3Type: string;
  sns3Account: string;
  business: string;
  businessName: string;
  industry: string;
  location: string;
  country: string;
  region: string;
  city: string;
  distance?: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  matchScore?: number;
  businessScore?: number;
  locationScore?: number;
  interestScore?: number;
  image?: string;
  profileImage?: string | null;
  role?: string;
  registeredAt: string;
}

interface FormDataState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  chatworkId: string;
  sns1Type: string;
  sns1Account: string;
  sns2Type: string;
  sns2Account: string;
  sns3Type: string;
  sns3Account: string;
  businessName: string;
  industry: string;
  businessDescription: string;
  country: string;
  region: string;
  city: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  profileImage: File | null;
  profileImagePreview: string | null;
  [key: string]: any;
}

interface SearchFilters {
  industry: string;
  region: string;
  skill: string;
  interest: string;
}

const BusinessMatchingApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('welcome');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [registrationStep, setRegistrationStep] = useState<number>(1);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState<string>('');
  const [tempSkill, setTempSkill] = useState<string>('');
  const [tempInterest, setTempInterest] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [membersList, setMembersList] = useState<UserProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>('');
  const [adminUsersList, setAdminUsersList] = useState<UserProfile[]>([]);
  const [adminRefreshKey, setAdminRefreshKey] = useState<number>(0);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState<boolean>(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState<boolean>(false);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    industry: '',
    region: '',
    skill: '',
    interest: ''
  });
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [logoImage, setLogoImage] = useState<string | null | ArrayBuffer>(null);

  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    chatworkId: '',
    sns1Type: '',
    sns1Account: '',
    sns2Type: '',
    sns2Account: '',
    sns3Type: '',
    sns3Account: '',
    businessName: '',
    industry: '',
    businessDescription: '',
    country: '',
    region: '',
    city: '',
    skills: [],
    interests: [],
    message: '',
    mission: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
    profileImage: null,
    profileImagePreview: null
  });

  useEffect(() => {
    const token = getStoredToken();
    const publicViews = ['welcome', 'register', 'forgot-password', 'reset-link-sent', 'reset-password', 'password-reset-complete', 'login'];
    if (!token) {
      if (!publicViews.includes(currentView)) setCurrentView('welcome');
      return;
    }
    apiMe().then((res) => {
      if (res.ok && res.user) {
        setIsLoggedIn(true);
        setCurrentUserProfile(res.user as UserProfile);
        setIsAdmin((res.user as ApiUserProfile).role === 'admin');
      } else {
        setStoredToken(null);
        if (!publicViews.includes(currentView)) setCurrentView('welcome');
      }
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !getStoredToken()) return;
    setMembersLoading(true);
    apiMembers()
      .then((res) => {
        if (res.ok && res.users) setMembersList(res.users as UserProfile[]);
      })
      .finally(() => setMembersLoading(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (currentView === 'admin' && isAdmin && getStoredToken()) {
      setApiError('');
      apiUsers().then((r) => {
        if (r.ok && r.users) {
          setAdminUsersList(r.users as UserProfile[]);
        } else {
          setApiError(`ユーザー一覧の取得に失敗: ${r.error || `status=${r.status}`}`);
        }
      }).catch((e) => {
        setApiError(`ユーザー一覧の取得エラー: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
  }, [currentView, isAdmin, adminRefreshKey]);

  // パスワード再設定リンクから遷移した場合（#reset-password?token=xxx）
  useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/#reset-password\?token=([^&]+)/);
    if (match && match[1]) {
      setResetToken(match[1]);
      setCurrentView('reset-password');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profileImage: file,
          profileImagePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData(prev => ({ ...prev, interests: [...prev.interests, interest] }));
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
  };

  const handleSearchFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchFilters(prev => ({ ...prev, [name]: value }));
  };

  const performSearch = () => {
    let results = [...membersList];

    if (searchFilters.industry) {
      results = results.filter(user => 
        user.industry.toLowerCase().includes(searchFilters.industry.toLowerCase())
      );
    }

    if (searchFilters.region) {
      results = results.filter(user => 
        user.region.toLowerCase().includes(searchFilters.region.toLowerCase()) ||
        user.city.toLowerCase().includes(searchFilters.region.toLowerCase())
      );
    }

    if (searchFilters.skill) {
      results = results.filter(user => 
        user.skills.some(skill => 
          skill.toLowerCase().includes(searchFilters.skill.toLowerCase())
        )
      );
    }

    if (searchFilters.interest) {
      results = results.filter(user => 
        user.interests.some(interest => 
          interest.toLowerCase().includes(searchFilters.interest.toLowerCase())
        )
      );
    }

    setSearchResults(results);
  };

  const downloadCSV = () => {
    const headers = [
      'ID',
      '名前',
      'メールアドレス',
      '電話番号',
      'Chatwork ID',
      'SNS1種類',
      'SNS1アカウント',
      'SNS2種類',
      'SNS2アカウント',
      'SNS3種類',
      'SNS3アカウント',
      'ビジネス名',
      '業種',
      'ビジネス内容',
      '国',
      '都道府県',
      '市区町村',
      '提供できる価値',
      '興味・関心',
      'メッセージ',
      '価値観・ミッション',
      '登録日'
    ];

    const rows = adminUsersList.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.chatworkId || '',
      user.sns1Type || '',
      user.sns1Account || '',
      user.sns2Type || '',
      user.sns2Account || '',
      user.sns3Type || '',
      user.sns3Account || '',
      user.businessName,
      user.industry,
      (user as UserProfile & { business?: string }).business ?? user.businessName ?? '',
      user.country,
      user.region,
      user.city,
      user.skills.join('、'),
      user.interests.join('、'),
      user.message || '',
      user.mission || '',
      user.registeredAt
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `users_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedUserIds).filter((id) => id !== currentUserProfile?.id);
    if (ids.length === 0) {
      alert('削除対象のユーザーを選択してください（自分自身は除外されます）');
      return;
    }
    const names = adminUsersList
      .filter((u) => ids.includes(u.id))
      .map((u) => `${u.name}（${u.email}）`)
      .join('\n');
    if (!confirm(`以下の ${ids.length} 名を削除しますか？\nこの操作は取り消せません。\n\n${names}`)) return;
    setBulkDeleting(true);
    const errors: string[] = [];
    const deleted: number[] = [];
    for (const id of ids) {
      try {
        const res = await apiDeleteUser(id);
        if (res.ok && res.success) {
          deleted.push(id);
        } else {
          const user = adminUsersList.find((u) => u.id === id);
          errors.push(`${user?.name || `ID:${id}`}: ${res.error || '削除失敗'}`);
        }
      } catch {
        errors.push(`ID:${id}: 通信エラー`);
      }
    }
    if (deleted.length > 0) {
      setAdminUsersList((prev) => prev.filter((u) => !deleted.includes(u.id)));
    }
    setSelectedUserIds(new Set());
    setBulkDeleting(false);
    if (errors.length > 0) {
      alert(`${deleted.length} 件削除しました。\n以下は失敗しました:\n${errors.join('\n')}`);
    } else {
      alert(`${deleted.length} 件を削除しました。`);
    }
  };

  const renderStars = (score?: number) => {
    const s = score || 0;
    return '★'.repeat(s) + '☆'.repeat(5 - s);
  };

  const renderWelcomeView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 text-white p-6">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">YCS</h1>
        <h2 className="text-xl sm:text-3xl font-bold mb-6">マッチングプラットフォーム</h2>
        <p className="text-xl opacity-90 mb-2">ビジネス × 居住地 × 趣味</p>
        <p className="text-lg opacity-80">3つの軸で最適なパートナーを見つけよう</p>
      </div>

      <div className="space-y-4 w-full max-w-md mb-12">
        <button 
          onClick={() => {
            setPasswordError('');
            setShowPassword(false);
            setCurrentView('register');
          }}
          className="w-full bg-white text-purple-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
        >
          新規登録（無料）
        </button>
        <button 
          onClick={() => {
            setPasswordError('');
            setApiError('');
            setCurrentView('login');
          }}
          className="w-full bg-transparent border-2 border-white text-white py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all"
        >
          ログイン
        </button>
        <div className="text-center py-2">
          <button 
            onClick={() => setCurrentView('forgot-password')}
            className="text-white text-sm hover:text-gray-200 underline font-semibold"
          >
            パスワードを忘れた方はこちら
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 max-w-3xl mb-8">
        <div className="text-center">
          <Briefcase size={48} className="mx-auto mb-2" />
          <p className="font-semibold">ビジネス連携</p>
        </div>
        <div className="text-center">
          <MapPin size={48} className="mx-auto mb-2" />
          <p className="font-semibold">地域交流</p>
        </div>
        <div className="text-center">
          <Heart size={48} className="mx-auto mb-2" />
          <p className="font-semibold">趣味でつながる</p>
        </div>
      </div>
    </div>
  );

  const renderLoginView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 text-white p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-gray-800">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">ログイン</h2>
          <p className="text-sm text-gray-600">メールアドレスとパスワードを入力してください</p>
        </div>
        {apiError && <p className="text-red-600 text-sm mb-4">{apiError}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();
            const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
            if (!email || !password) {
              setApiError('メールアドレスとパスワードを入力してください');
              return;
            }
            setApiError('');
            apiLogin(email, password).then((res) => {
              if (res.ok && res.token && res.user) {
                setStoredToken(res.token);
                setIsLoggedIn(true);
                setCurrentUserProfile(res.user as UserProfile);
                setIsAdmin((res.user as ApiUserProfile).role === 'admin');
                setCurrentView('home');
              } else {
                setApiError(res.error || 'ログインに失敗しました');
              }
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-2">メールアドレス</label>
            <input name="email" type="email" required className="w-full p-3 border-2 border-gray-300 rounded-lg" placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">パスワード</label>
            <input name="password" type="password" required className="w-full p-3 border-2 border-gray-300 rounded-lg" placeholder="パスワード" />
          </div>
          <button type="submit" className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700">
            ログイン
          </button>
        </form>
        <button onClick={() => { setApiError(''); setCurrentView('welcome'); }} className="w-full mt-4 text-gray-600 text-sm hover:underline">
          トップに戻る
        </button>
      </div>
    </div>
  );

  const renderRegistrationView = () => {
    const validatePassword = () => {
      if (formData.password.length < 8) {
        setPasswordError('パスワードは8文字以上で設定してください');
        return false;
      }
      if (formData.password !== formData.passwordConfirm) {
        setPasswordError('パスワードが一致しません');
        return false;
      }
      setPasswordError('');
      return true;
    };

    const handleNextStep = () => {
      if (registrationStep === 1) {
        if (!formData.name || !formData.email || !formData.password || !formData.passwordConfirm || !formData.phone) {
          alert('必須項目（お名前、メールアドレス、パスワード、電話番号）をすべて入力してください');
          return;
        }
        if (!validatePassword()) {
          return;
        }
        if (!formData.agreedToTerms) {
          alert('利用規約に同意してください');
          return;
        }
        if (!formData.agreedToPrivacy) {
          alert('プライバシーポリシーに同意してください');
          return;
        }
      }
      if (registrationStep === 2) {
        if (!formData.businessName || !formData.industry) {
          alert('必須項目（ビジネス名、業種）をすべて入力してください');
          return;
        }
      }
      setRegistrationStep(registrationStep + 1);
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">新規登録</h2>
            <button 
              onClick={() => setCurrentView('welcome')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    registrationStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1 ${registrationStep > step ? 'bg-purple-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span>基本情報</span>
              <span>ビジネス</span>
              <span>プロフィール</span>
            </div>
          </div>

          {apiError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">エラー（下の文を選択してコピーできます）</p>
              <pre className="text-sm text-red-700 whitespace-pre-wrap break-all overflow-auto min-h-[120px] p-3 bg-white rounded border border-red-100" style={{ userSelect: 'text' }}>{apiError}</pre>
              <button type="button" onClick={() => setApiError('')} className="mt-2 text-sm text-red-600 hover:underline font-semibold">閉じる</button>
            </div>
          )}

          {registrationStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">基本情報を入力</h3>
              
              <div className="flex flex-col items-center mb-6">
                <label className="block text-sm font-semibold mb-2">プロフィール画像</label>
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-purple-500">
                    {formData.profileImagePreview ? (
                      <img src={formData.profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl text-gray-400">👤</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-full p-2 cursor-pointer hover:bg-purple-700 transition-colors">
                    <Plus size={20} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">クリックして画像を選択</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">お名前 *</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">メールアドレス *</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">パスワード *</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="8文字以上"
                />
                <p className="text-xs text-gray-500 mt-1">8文字以上で設定してください</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">パスワード（確認） *</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="もう一度入力してください"
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm">パスワードを表示する</label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">電話番号 *</label>
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="090-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Chatwork ID</label>
                <input 
                  type="text"
                  name="chatworkId"
                  value={formData.chatworkId}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="your_chatwork_id"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">価値観・ミッション</label>
                <textarea 
                  name="mission"
                  value={formData.mission}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none h-24"
                  placeholder="あなたのビジネスの価値観やミッション、大切にしていることを入力してください..."
                />
                <p className="text-xs text-gray-500 mt-1">ビジネスで大切にしている価値観や目指していることを教えてください</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">SNSアカウント（最大3つ）</label>
                <div className="space-y-3">
                  {[1, 2, 3].map(num => (
                    <div key={num} className="grid grid-cols-3 gap-2">
                      <select
                        name={`sns${num}Type`}
                        value={formData[`sns${num}Type`]}
                        onChange={handleInputChange}
                        className="p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">SNS選択</option>
                        <option value="𝕏 (Twitter)">𝕏 (Twitter)</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="TikTok">TikTok</option>
                        <option value="LINE">LINE</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Note">Note</option>
                        <option value="その他">その他</option>
                      </select>
                      <input 
                        type="text"
                        name={`sns${num}Account`}
                        value={formData[`sns${num}Account`]}
                        onChange={handleInputChange}
                        className="col-span-2 p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                        placeholder="アカウント名またはURL"
                        disabled={!formData[`sns${num}Type`]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                    className="mr-3 mt-1"
                  />
                  <label className="text-sm">
                    <a href="/match/terms.html" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">利用規約</a>に同意します <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPrivacy}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreedToPrivacy: e.target.checked }))}
                    className="mr-3 mt-1"
                  />
                  <label className="text-sm">
                    <a href="/match/privacy.html" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">プライバシーポリシー</a>に同意します <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {registrationStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">ビジネス情報を入力</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">ビジネス名 *</label>
                <input 
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="株式会社〇〇"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">業種 *</label>
                <select 
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  <option value="">選択してください</option>
                  <option value="it">IT・テクノロジー</option>
                  <option value="manufacturing">製造業</option>
                  <option value="retail">小売・EC</option>
                  <option value="food">飲食業</option>
                  <option value="consulting">コンサルティング</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">ビジネス内容</label>
                <textarea 
                  name="businessDescription"
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none h-24"
                  placeholder="どんなビジネスをされていますか？"
                />
              </div>
            </div>
          )}

          {registrationStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">プロフィール詳細</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">国</label>
                  <input 
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="日本"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">都道府県</label>
                  <input 
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="東京都"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">市区町村</label>
                  <input 
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="港区"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">提供できる価値・スキル <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={tempSkill}
                    onChange={(e) => setTempSkill(e.target.value)}
                    className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="例：Webマーケティング"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addSkill(tempSkill);
                        setTempSkill('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      addSkill(tempSkill);
                      setTempSkill('');
                    }}
                    className="bg-purple-600 text-white px-4 rounded-lg hover:bg-purple-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-purple-900">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">興味・関心 <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={tempInterest}
                    onChange={(e) => setTempInterest(e.target.value)}
                    className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="例：DX推進"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addInterest(tempInterest);
                        setTempInterest('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      addInterest(tempInterest);
                      setTempInterest('');
                    }}
                    className="bg-purple-600 text-white px-4 rounded-lg hover:bg-purple-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="hover:text-blue-900">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">メンバーへのメッセージ <span className="text-red-500">*</span></label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none h-32"
                  placeholder="他のメンバーに向けて、自己紹介やつながりたい内容などを自由に入力してください..."
                />
                <p className="text-xs text-gray-500 mt-1">このメッセージは他のメンバーがあなたのプロフィールを見た際に表示されます</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            {registrationStep > 1 && (
              <button 
                onClick={() => setRegistrationStep(registrationStep - 1)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                戻る
              </button>
            )}
            {registrationStep < 3 ? (
              <button 
                onClick={handleNextStep}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
              >
                次へ
              </button>
            ) : (
              <button
                onClick={async () => {
                  const finalSkills = [...formData.skills];
                  if (tempSkill.trim() && !finalSkills.includes(tempSkill.trim())) {
                    finalSkills.push(tempSkill.trim());
                  }
                  const finalInterests = [...formData.interests];
                  if (tempInterest.trim() && !finalInterests.includes(tempInterest.trim())) {
                    finalInterests.push(tempInterest.trim());
                  }

                  // ステップ3 必須項目チェック
                  if (finalSkills.length === 0) {
                    alert('「提供できる価値・スキル」を1つ以上入力してください');
                    return;
                  }
                  if (finalInterests.length === 0) {
                    alert('「興味・関心」を1つ以上入力してください');
                    return;
                  }
                  if (!formData.message.trim()) {
                    alert('「メンバーへのメッセージ」を入力してください');
                    return;
                  }

                  setTempSkill('');
                  setTempInterest('');

                  const body: RegisterBody = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    chatworkId: formData.chatworkId,
                    sns1Type: formData.sns1Type,
                    sns1Account: formData.sns1Account,
                    sns2Type: formData.sns2Type,
                    sns2Account: formData.sns2Account,
                    sns3Type: formData.sns3Type,
                    sns3Account: formData.sns3Account,
                    businessName: formData.businessName,
                    industry: formData.industry,
                    businessDescription: formData.businessDescription,
                    country: formData.country,
                    region: formData.region,
                    city: formData.city,
                    skills: finalSkills,
                    interests: finalInterests,
                    message: formData.message,
                    mission: formData.mission,
                    profileImageUrl: formData.profileImagePreview && typeof formData.profileImagePreview === 'string' && !formData.profileImagePreview.startsWith('data:') ? formData.profileImagePreview : undefined,
                  };

                  const regRes = await apiRegister(body);
                  if (!regRes.ok || regRes.error) {
                    setApiError(regRes.error || '登録に失敗しました');
                    return;
                  }
                  const loginRes = await apiLogin(formData.email, formData.password);
                  if (loginRes.ok && loginRes.token && loginRes.user) {
                    setStoredToken(loginRes.token);
                    setIsLoggedIn(true);
                    setCurrentUserProfile(loginRes.user as UserProfile);
                    setIsAdmin((loginRes.user as ApiUserProfile).role === 'admin');
                    setCurrentView('registration-complete');
                  } else {
                    setCurrentView('registration-complete');
                  }
                }}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
              >
                登録完了
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRegistrationCompleteView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800">登録完了！</h2>
        <p className="text-gray-600 mb-6">
          YCSマッチングプラットフォームへようこそ！<br />
          登録が完了しました。
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
          <h3 className="font-bold mb-3 text-gray-800">ログイン情報</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">メールアドレス:</span>
              <p className="font-semibold text-gray-800">{formData.email}</p>
            </div>
            <div>
              <span className="text-gray-600">パスワード:</span>
              <p className="font-semibold text-gray-800">設定済み（●●●●●●●●）</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ※ この情報は大切に保管してください
          </p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
          <p className="text-sm text-blue-800">
            📧 確認メールを <strong>{formData.email}</strong> に送信しました。<br />
            登録内容とログイン方法を記載しています。このメールアドレスとパスワードで、トップの「ログイン」からログインできます。
          </p>
        </div>

        <button
          onClick={() => setCurrentView('home')}
          className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 transition-colors"
        >
          マッチングを始める
        </button>
      </div>
    </div>
  );

  const renderForgotPasswordView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold mb-2 text-gray-800">パスワードを忘れた方</h2>
          <p className="text-gray-600 text-sm">
            登録されているメールアドレスを入力してください。<br />
            パスワード再設定用のリンクをお送りします。
          </p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">メールアドレス</label>
            <input 
              type="email"
              value={resetEmail}
              onChange={(e) => { setResetEmail(e.target.value); setApiError(''); }}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="example@email.com"
            />
          </div>

          <button
            disabled={forgotPasswordLoading}
            onClick={async () => {
              if (!resetEmail) {
                setApiError('メールアドレスを入力してください');
                return;
              }
              if (!resetEmail.includes('@')) {
                setApiError('正しいメールアドレスを入力してください');
                return;
              }
              setApiError('');
              setForgotPasswordLoading(true);
              const res = await apiForgotPassword(resetEmail);
              setForgotPasswordLoading(false);
              if (res.ok) {
                setCurrentView('reset-link-sent');
              } else {
                setApiError(res.error || '送信に失敗しました');
              }
            }}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {forgotPasswordLoading ? '送信中...' : '再設定リンクを送信'}
          </button>

          <button
            onClick={() => {
              setResetEmail('');
              setCurrentView('welcome');
            }}
            className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    </div>
  );

  const renderResetLinkSentView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">📧</div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800">メールを送信しました</h2>
        <p className="text-gray-600 mb-6">
          <strong>{resetEmail}</strong> 宛に<br />
          パスワード再設定用のリンクを送信しました。
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
          <p className="text-sm text-blue-800 mb-2">
            <strong>次の手順：</strong>
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>メールボックスを確認してください</li>
            <li>メール内のリンクをクリック</li>
            <li>新しいパスワードを設定</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
          <p className="text-xs text-yellow-800">
            ⚠️ メールが届かない場合は、迷惑メールフォルダもご確認ください。<br />
            リンクの有効期限は1時間です。
          </p>
        </div>

        <button
          onClick={() => {
            setResetEmail('');
            setCurrentView('welcome');
          }}
          className="w-full text-gray-600 text-sm hover:underline"
        >
          ログイン画面に戻る
        </button>
      </div>
    </div>
  );

  const renderResetPasswordView = () => {
    const validatePassword = () => {
      if (newPassword.length < 8) {
        setPasswordError('パスワードは8文字以上で設定してください');
        return false;
      }
      if (newPassword !== newPasswordConfirm) {
        setPasswordError('パスワードが一致しません');
        return false;
      }
      setPasswordError('');
      return true;
    };

    if (!resetToken) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">🔑</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">無効なリンクです</h2>
            <p className="text-gray-600 mb-6">
              パスワード再設定は、メールでお送りしたリンクから行ってください。<br />
              リンクの有効期限は1時間です。
            </p>
            <button onClick={() => setCurrentView('welcome')} className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700">
              トップに戻る
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🔑</div>
            <h2 className="text-3xl font-bold mb-2 text-gray-800">新しいパスワードを設定</h2>
            <p className="text-gray-600 text-sm">
              8文字以上の新しいパスワードを入力してください
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">新しいパスワード</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setApiError(''); }}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="8文字以上"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">新しいパスワード（確認）</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                placeholder="もう一度入力してください"
              />
              {passwordError && (
                <p className="text-xs text-red-600 mt-1">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm">パスワードを表示する</label>
            </div>

            <button
              disabled={resetPasswordLoading}
              onClick={async () => {
                if (!newPassword || !newPasswordConfirm) {
                  setApiError('すべての項目を入力してください');
                  return;
                }
                if (!validatePassword()) {
                  return;
                }
                setApiError('');
                setResetPasswordLoading(true);
                const res = await apiResetPassword(resetToken, newPassword);
                setResetPasswordLoading(false);
                if (res.ok && res.success !== false) {
                  setResetToken('');
                  setNewPassword('');
                  setNewPasswordConfirm('');
                  setCurrentView('password-reset-complete');
                } else {
                  setApiError(res.error || 'パスワードの変更に失敗しました');
                }
              }}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {resetPasswordLoading ? '変更中...' : 'パスワードを変更する'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPasswordResetCompleteView = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800">パスワードを変更しました</h2>
        <p className="text-gray-600 mb-6">
          パスワードの変更が完了しました。<br />
          新しいパスワードでログインしてください。
        </p>
        
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
          <p className="text-sm text-green-800">
            ✓ パスワードが正常に変更されました<br />
            ✓ 次回ログイン時から新しいパスワードをご利用ください
          </p>
        </div>

        <button
          onClick={() => {
            setResetEmail('');
            setNewPassword('');
            setNewPasswordConfirm('');
            setCurrentView('welcome');
          }}
          className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 transition-colors"
        >
          ログイン画面へ
        </button>
      </div>
    </div>
  );

  if (currentView === 'welcome') return renderWelcomeView();
  if (currentView === 'login') return renderLoginView();
  if (currentView === 'register') return renderRegistrationView();
  if (currentView === 'registration-complete') return renderRegistrationCompleteView();
  if (currentView === 'forgot-password') return renderForgotPasswordView();
  if (currentView === 'reset-link-sent') return renderResetLinkSentView();
  if (currentView === 'reset-password') return renderResetPasswordView();
  if (currentView === 'password-reset-complete') return renderPasswordResetCompleteView();

  const handleLogout = () => {
    setStoredToken(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUserProfile(null);
    setCurrentView('welcome');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1">
      {isLoggedIn && (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-gray-800">YCS マッチング</span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className="text-sm font-semibold text-amber-600 hover:text-amber-800 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1"
                >
                  <Shield size={16} />
                  管理画面
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>
      )}
      {currentView === 'home' && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center overflow-hidden">
                    {currentUserProfile?.profileImage ? (
                      <img src={currentUserProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">ようこそ!</h2>
                    <p className="text-sm opacity-90">{currentUserProfile?.name || 'ゲスト'}さん</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Users className="mr-2" size={24} />
                おすすめマッチ
              </h3>
              {membersLoading ? (
                <p className="text-gray-600">読み込み中...</p>
              ) : (
              <div className="space-y-4">
                {membersList.filter(u => u.id !== currentUserProfile?.id).map(user => (
                  <div 
                    key={user.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedUser(user);
                      setCurrentView('profile');
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                          <img src={(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">{(user as UserProfile & { image?: string }).image ?? '👤'}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xl font-bold">{user.name}</h4>
                          <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                            {(user as UserProfile & { matchScore?: number }).matchScore ?? 0}%
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p className="flex items-center text-gray-700">
                            <Briefcase size={16} className="mr-2" />
                            {(user as UserProfile & { business?: string }).business ?? user.businessName ?? ''}
                          </p>
                          <p className="flex items-center text-gray-700">
                            <MapPin size={16} className="mr-2" />
                            {(user as UserProfile & { location?: string }).location ?? `${user.region}・${user.city}`}（{(user as UserProfile & { distance?: string }).distance ?? '—'}）
                          </p>
                          {user.message && (
                            <p className="text-gray-600 italic mt-2 pt-2 border-t">
                              💬 "{user.message.substring(0, 80)}{user.message.length > 80 ? '...' : ''}"
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between text-sm">
                            <span>ビジネス {renderStars((user as UserProfile & { businessScore?: number }).businessScore)}</span>
                            <span>近隣性 {renderStars((user as UserProfile & { locationScore?: number }).locationScore)}</span>
                            <span>趣味 {renderStars((user as UserProfile & { interestScore?: number }).interestScore)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => setCurrentView('mypage')}
                className="bg-orange-500 text-white py-4 rounded-lg font-bold hover:bg-orange-600 transition-colors flex flex-col items-center"
              >
                <User size={24} className="mb-1" />
                <span>マイページ</span>
              </button>
              <button 
                onClick={() => setCurrentView('search')}
                className="bg-blue-500 text-white py-4 rounded-lg font-bold hover:bg-blue-600 transition-colors flex flex-col items-center"
              >
                <Search size={24} className="mb-1" />
                <span>検索</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'mypage' && currentUserProfile && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setCurrentView('home')}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← ホームに戻る
              </button>
              {!isEditMode ? (
                <button
                  onClick={() => {
                    setIsEditMode(true);
                    setFormData({
                      ...formData,
                      name: currentUserProfile.name,
                      email: currentUserProfile.email,
                      phone: currentUserProfile.phone,
                      chatworkId: currentUserProfile.chatworkId,
                      sns1Type: currentUserProfile.sns1Type,
                      sns1Account: currentUserProfile.sns1Account,
                      sns2Type: currentUserProfile.sns2Type,
                      sns2Account: currentUserProfile.sns2Account,
                      sns3Type: currentUserProfile.sns3Type,
                      sns3Account: currentUserProfile.sns3Account,
                      businessName: currentUserProfile.businessName,
                      industry: currentUserProfile.industry,
                      businessDescription: currentUserProfile.business,
                      country: currentUserProfile.country,
                      region: currentUserProfile.region,
                      city: currentUserProfile.city,
                      skills: currentUserProfile.skills,
                      interests: currentUserProfile.interests,
                      message: currentUserProfile.message,
                      mission: currentUserProfile.mission,
                      profileImage: null,
                      profileImagePreview: currentUserProfile.profileImage || null
                    });
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  編集する
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      // Reset form data to current profile is handled by button click logic above mostly
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-500 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      setCurrentUserProfile({
                        ...currentUserProfile,
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        chatworkId: formData.chatworkId,
                        sns1Type: formData.sns1Type,
                        sns1Account: formData.sns1Account,
                        sns2Type: formData.sns2Type,
                        sns2Account: formData.sns2Account,
                        sns3Type: formData.sns3Type,
                        sns3Account: formData.sns3Account,
                        businessName: formData.businessName,
                        industry: formData.industry,
                        business: formData.businessDescription,
                        country: formData.country,
                        region: formData.region,
                        city: formData.city,
                        location: `${formData.region}・${formData.city}`,
                        skills: formData.skills,
                        interests: formData.interests,
                        message: formData.message,
                        mission: formData.mission,
                        profileImage: formData.profileImagePreview || currentUserProfile.profileImage
                      });
                      setIsEditMode(false);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Save size={18} />
                    保存する
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-8 text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-white border-4 border-white shadow-lg">
                    {formData.profileImagePreview || currentUserProfile?.profileImage ? (
                      <img 
                        src={formData.profileImagePreview || currentUserProfile.profileImage || undefined} 
                        alt={currentUserProfile?.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>
                    )}
                  </div>
                  {isEditMode && (
                    <label className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-full p-2 cursor-pointer hover:bg-purple-700 transition-colors">
                      <Plus size={20} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <h2 className="text-3xl font-bold mt-4">
                  {isEditMode ? formData.name : currentUserProfile?.name}
                </h2>
                <p className="text-sm opacity-90">登録日: {currentUserProfile?.registeredAt}</p>
              </div>

              <div className="p-6 space-y-6">
                {currentUserProfile ? (
                  <>
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-blue-600 flex items-center">
                        <User className="mr-2" size={24} />
                        基本情報
                      </h3>
                      {isEditMode ? (
                        <div className="space-y-3 ml-8">
                          <div>
                            <label className="block text-sm font-semibold mb-1">名前</label>
                            <input 
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">メールアドレス</label>
                            <input 
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">電話番号</label>
                            <input 
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">Chatwork ID</label>
                            <input 
                              type="text"
                              name="chatworkId"
                              value={formData.chatworkId}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">価値観・ミッション</label>
                            <textarea 
                              name="mission"
                              value={formData.mission}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg h-24"
                              placeholder="価値観やミッションを入力..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm ml-8">
                          <p><strong>メール:</strong> {currentUserProfile.email}</p>
                          <p><strong>電話:</strong> {currentUserProfile.phone}</p>
                          <p><strong>Chatwork ID:</strong> {currentUserProfile.chatworkId || '未設定'}</p>
                          {currentUserProfile.mission && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="font-semibold mb-1">価値観・ミッション:</p>
                              <p className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-500">{currentUserProfile.mission}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center">
                        <MessageCircle className="mr-2" size={24} />
                        SNSアカウント
                      </h3>
                      {isEditMode ? (
                        <div className="space-y-3 ml-8">
                          {[1, 2, 3].map(num => (
                            <div key={num} className="grid grid-cols-3 gap-2">
                              <select
                                name={`sns${num}Type`}
                                value={formData[`sns${num}Type`]}
                                onChange={handleInputChange}
                                className="p-2 border-2 border-gray-300 rounded-lg"
                              >
                                <option value="">SNS選択</option>
                                <option value="𝕏 (Twitter)">𝕏 (Twitter)</option>
                                <option value="Facebook">Facebook</option>
                                <option value="Instagram">Instagram</option>
                                <option value="YouTube">YouTube</option>
                                <option value="TikTok">TikTok</option>
                                <option value="LINE">LINE</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Note">Note</option>
                                <option value="その他">その他</option>
                              </select>
                              <input 
                                type="text"
                                name={`sns${num}Account`}
                                value={formData[`sns${num}Account`]}
                                onChange={handleInputChange}
                                className="col-span-2 p-2 border-2 border-gray-300 rounded-lg"
                                placeholder="アカウント名またはURL"
                                disabled={!formData[`sns${num}Type`]}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm ml-8">
                          {currentUserProfile.sns1Type && (
                            <p><strong>{currentUserProfile.sns1Type}:</strong> {currentUserProfile.sns1Account}</p>
                          )}
                          {currentUserProfile.sns2Type && (
                            <p><strong>{currentUserProfile.sns2Type}:</strong> {currentUserProfile.sns2Account}</p>
                          )}
                          {currentUserProfile.sns3Type && (
                            <p><strong>{currentUserProfile.sns3Type}:</strong> {currentUserProfile.sns3Account}</p>
                          )}
                          {!currentUserProfile.sns1Type && !currentUserProfile.sns2Type && !currentUserProfile.sns3Type && (
                            <p className="text-gray-500">未設定</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-purple-600 flex items-center">
                        <Briefcase className="mr-2" size={24} />
                        ビジネス情報
                      </h3>
                      {isEditMode ? (
                        <div className="space-y-3 ml-8">
                          <div>
                            <label className="block text-sm font-semibold mb-1">ビジネス名</label>
                            <input 
                              type="text"
                              name="businessName"
                              value={formData.businessName}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">業種</label>
                            <select 
                              name="industry"
                              value={formData.industry}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            >
                              <option value="">選択してください</option>
                              <option value="it">IT・テクノロジー</option>
                              <option value="manufacturing">製造業</option>
                              <option value="retail">小売・EC</option>
                              <option value="food">飲食業</option>
                              <option value="consulting">コンサルティング</option>
                              <option value="other">その他</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">ビジネス内容</label>
                            <textarea 
                              name="businessDescription"
                              value={formData.businessDescription}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg h-20"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm ml-8">
                          <p><strong>ビジネス名:</strong> {currentUserProfile.businessName}</p>
                          <p><strong>業種:</strong> {currentUserProfile.industry}</p>
                          <p><strong>内容:</strong> {currentUserProfile.business}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-orange-600 flex items-center">
                        <MapPin className="mr-2" size={24} />
                        所在地
                      </h3>
                      {isEditMode ? (
                        <div className="grid grid-cols-3 gap-3 ml-8">
                          <div>
                            <label className="block text-sm font-semibold mb-1">国</label>
                            <input 
                              type="text"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">都道府県</label>
                            <input 
                              type="text"
                              name="region"
                              value={formData.region}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">市区町村</label>
                            <input 
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full p-2 border-2 border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm ml-8">
                          <p><strong>国:</strong> {currentUserProfile.country}</p>
                          <p><strong>都道府県:</strong> {currentUserProfile.region}</p>
                          <p><strong>市区町村:</strong> {currentUserProfile.city}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-indigo-600 flex items-center">
                        <TrendingUp className="mr-2" size={24} />
                        提供できる価値
                      </h3>
                      {isEditMode ? (
                        <div className="ml-8">
                          <div className="flex gap-2 mb-2">
                            <input 
                              type="text"
                              id="skill-input"
                              className="flex-1 p-2 border-2 border-gray-300 rounded-lg"
                              placeholder="スキルを追加"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addSkill((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById('skill-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  addSkill(input.value);
                                  input.value = '';
                                }
                              }}
                              className="bg-purple-600 text-white px-3 rounded-lg hover:bg-purple-700"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.skills.map((skill, idx) => (
                              <span key={idx} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                {skill}
                                <button onClick={() => removeSkill(skill)}>
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 ml-8">
                          {currentUserProfile.skills && currentUserProfile.skills.length > 0 ? (
                            currentUserProfile.skills.map((skill, idx) => (
                              <span key={idx} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">未設定</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-pink-600 flex items-center">
                        <Heart className="mr-2" size={24} />
                        興味・関心
                      </h3>
                      {isEditMode ? (
                        <div className="ml-8">
                          <div className="flex gap-2 mb-2">
                            <input 
                              type="text"
                              id="interest-input"
                              className="flex-1 p-2 border-2 border-gray-300 rounded-lg"
                              placeholder="興味を追加"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addInterest((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById('interest-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  addInterest(input.value);
                                  input.value = '';
                                }
                              }}
                              className="bg-purple-600 text-white px-3 rounded-lg hover:bg-purple-700"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.interests.map((interest, idx) => (
                              <span key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                {interest}
                                <button onClick={() => removeInterest(interest)}>
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 ml-8">
                          {currentUserProfile.interests && currentUserProfile.interests.length > 0 ? (
                            currentUserProfile.interests.map((interest, idx) => (
                              <span key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                                {interest}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">未設定</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4 text-cyan-600 flex items-center">
                        <MessageCircle className="mr-2" size={24} />
                        メンバーへのメッセージ
                      </h3>
                      {isEditMode ? (
                        <div className="ml-8">
                          <textarea 
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg h-32"
                            placeholder="メンバーへのメッセージを入力..."
                          />
                        </div>
                      ) : (
                        <p className="text-sm bg-cyan-50 p-4 rounded-lg italic ml-8">
                          {currentUserProfile.message || 'メッセージ未設定'}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-red-600">プロフィール情報が読み込まれていません</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'profile' && selectedUser && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="space-y-6">
            <button 
              onClick={() => setCurrentView('home')}
              className="text-blue-600 hover:text-blue-800 font-semibold mb-4"
            >
              ← ホームに戻る
            </button>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg">
                  {selectedUser.profileImage ? (
                    <img src={selectedUser.profileImage} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">{selectedUser.image}</div>
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-2">{selectedUser.name}</h2>
                <div className="bg-white bg-opacity-20 rounded-full px-4 py-2 inline-block">
                  <span className="text-2xl font-bold">マッチ度: {selectedUser.matchScore}%</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center mb-3">
                    <Briefcase className="mr-2 text-blue-600" size={24} />
                    <h3 className="text-lg font-bold">ビジネス情報</h3>
                  </div>
                  <p className="text-gray-700 ml-8">{selectedUser.business}</p>
                </div>

                <div>
                  <div className="flex items-center mb-3">
                    <MapPin className="mr-2 text-green-600" size={24} />
                    <h3 className="text-lg font-bold">居住地</h3>
                  </div>
                  <p className="text-gray-700 ml-8">{selectedUser.location}（あなたから{selectedUser.distance}）</p>
                </div>

                <div>
                  <div className="flex items-center mb-3">
                    <MessageCircle className="mr-2 text-blue-600" size={24} />
                    <h3 className="text-lg font-bold">連絡先情報</h3>
                  </div>
                  <div className="ml-8 space-y-3">
                    {selectedUser.chatworkId && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-1">Chatwork ID</p>
                        <p className="text-blue-600 font-mono">{selectedUser.chatworkId}</p>
                      </div>
                    )}
                    {selectedUser.sns1Type && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-1">{selectedUser.sns1Type}</p>
                        <p className="text-purple-600">{selectedUser.sns1Account}</p>
                      </div>
                    )}
                    {selectedUser.sns2Type && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-1">{selectedUser.sns2Type}</p>
                        <p className="text-purple-600">{selectedUser.sns2Account}</p>
                      </div>
                    )}
                    {selectedUser.sns3Type && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-1">{selectedUser.sns3Type}</p>
                        <p className="text-purple-600">{selectedUser.sns3Account}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedUser.message && (
                  <div>
                    <div className="flex items-center mb-3">
                      <MessageCircle className="mr-2 text-cyan-600" size={24} />
                      <h3 className="text-lg font-bold">メッセージ</h3>
                    </div>
                    <p className="text-gray-700 ml-8 italic bg-cyan-50 p-4 rounded-lg">
                      "{selectedUser.message}"
                    </p>
                  </div>
                )}

                {selectedUser.mission && (
                  <div>
                    <div className="flex items-center mb-3">
                      <TrendingUp className="mr-2 text-yellow-600" size={24} />
                      <h3 className="text-lg font-bold">価値観・ミッション</h3>
                    </div>
                    <p className="text-gray-700 ml-8 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                      {selectedUser.mission}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center mb-3">
                    <TrendingUp className="mr-2 text-purple-600" size={24} />
                    <h3 className="text-lg font-bold">提供できる価値</h3>
                  </div>
                  <ul className="ml-8 space-y-1">
                    {selectedUser.skills.map((skill, idx) => (
                      <li key={idx} className="text-gray-700">・{skill}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center mb-3">
                    <Heart className="mr-2 text-red-600" size={24} />
                    <h3 className="text-lg font-bold">興味・学びたいこと</h3>
                  </div>
                  <ul className="ml-8 space-y-1">
                    {selectedUser.interests.map((interest, idx) => (
                      <li key={idx} className="text-gray-700">・{interest}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-3 text-center">マッチ度詳細</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>ビジネス</span>
                      <span className="text-lg">{renderStars(selectedUser.businessScore)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>近隣性</span>
                      <span className="text-lg">{renderStars(selectedUser.locationScore)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>趣味</span>
                      <span className="text-lg">{renderStars(selectedUser.interestScore)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center">
              <p className="text-sm mb-2">👆 上記の連絡先情報から直接コンタクトしてください</p>
              <p className="text-xs opacity-90">Chatwork、SNSなどでつながりましょう！</p>
            </div>
          </div>
        </div>
      )}

      {currentView === 'search' && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <Search className="mr-2" size={28} />
                メンバー検索
              </h2>
              <button 
                onClick={() => setCurrentView('home')}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← ホームに戻る
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">検索条件</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <Briefcase size={18} className="mr-2 text-blue-600" />
                    ビジネス（業種）
                  </label>
                  <input 
                    type="text"
                    name="industry"
                    value={searchFilters.industry}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例：IT、製造業、飲食業"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <MapPin size={18} className="mr-2 text-green-600" />
                    地域（都道府県・市区町村）
                  </label>
                  <input 
                    type="text"
                    name="region"
                    value={searchFilters.region}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder="例：東京、港区、横浜"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <TrendingUp size={18} className="mr-2 text-purple-600" />
                    提供できる価値・スキル
                  </label>
                  <input 
                    type="text"
                    name="skill"
                    value={searchFilters.skill}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="例：マーケティング、資金調達、DX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <Heart size={18} className="mr-2 text-pink-600" />
                    興味・関心
                  </label>
                  <input 
                    type="text"
                    name="interest"
                    value={searchFilters.interest}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none"
                    placeholder="例：ゴルフ、DX推進、SNSマーケティング"
                  />
                </div>

                <button
                  onClick={() => {
                    performSearch();
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-bold hover:from-blue-600 hover:to-purple-700 transition-all text-lg flex items-center justify-center gap-2"
                >
                  <Search size={24} />
                  検索する
                </button>

                <button
                  onClick={() => {
                    setSearchFilters({
                      industry: '',
                      region: '',
                      skill: '',
                      interest: ''
                    });
                    setSearchResults([]);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                >
                  条件をクリア
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">
                  検索結果（{searchResults.length}件）
                </h3>
                <div className="space-y-4">
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedUser(user);
                        setCurrentView('profile');
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                            <img src={(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">{(user as UserProfile & { image?: string }).image ?? '👤'}</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xl font-bold">{user.name}</h4>
                            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                              {(user as UserProfile & { matchScore?: number }).matchScore ?? 0}%
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <p className="flex items-center text-gray-700">
                              <Briefcase size={16} className="mr-2" />
                              {(user as UserProfile & { business?: string }).business ?? user.businessName ?? ''} - {user.industry}
                            </p>
                            <p className="flex items-center text-gray-700">
                              <MapPin size={16} className="mr-2" />
                              {(user as UserProfile & { location?: string }).location ?? `${user.region}・${user.city}`}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {user.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.length === 0 && searchFilters.industry === '' && searchFilters.region === '' && searchFilters.skill === '' && searchFilters.interest === '' ? null : searchResults.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <p className="text-gray-600 text-lg">条件に一致するメンバーが見つかりませんでした</p>
                <p className="text-sm text-gray-500 mt-2">別の条件で検索してみてください</p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'admin' && (
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-yellow-600" size={32} />
                <h2 className="text-3xl font-bold">管理者ダッシュボード</h2>
              </div>
              <button 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                ログアウト
              </button>
            </div>

            {apiError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-2">API通信エラー</p>
                <pre className="text-sm text-red-700 whitespace-pre-wrap break-all">{apiError}</pre>
                <button type="button" onClick={() => setApiError('')} className="mt-2 text-sm text-red-600 hover:underline font-semibold">閉じる</button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                <Users size={32} className="mb-2" />
                <p className="text-sm opacity-90">総登録者数</p>
                <p className="text-4xl font-bold">{adminUsersList.length}</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                <TrendingUp size={32} className="mb-2" />
                <p className="text-sm opacity-90">今月の新規登録</p>
                <p className="text-4xl font-bold">{(() => {
                  const now = new Date();
                  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  return adminUsersList.filter((u) => u.registeredAt?.startsWith(ym)).length;
                })()}</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                <MessageCircle size={32} className="mb-2" />
                <p className="text-sm opacity-90">総マッチング数</p>
                <p className="text-4xl font-bold">47</p>
              </div>
            </div>

            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setAdminRefreshKey((k) => k + 1)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} />
                更新
              </button>
              <button
                onClick={downloadCSV}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                登録者データをCSVでダウンロード
              </button>
              <button
                onClick={() => setCurrentView('admin-settings')}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Shield size={20} />
                管理者設定
              </button>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">登録ユーザー一覧</h3>
                {selectedUserIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                    {bulkDeleting ? '削除中...' : `選択した ${selectedUserIds.size} 件を一括削除`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-3 text-center text-sm font-semibold w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                          checked={adminUsersList.length > 0 && adminUsersList.every((u) => selectedUserIds.has(u.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(new Set(adminUsersList.map((u) => u.id)));
                            } else {
                              setSelectedUserIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">名前</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">メール</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ビジネス名</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">業種</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">地域</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">登録日</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">権限</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersList.map((user, index) => (
                      <tr
                        key={user.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedUserIds.has(user.id) ? 'ring-1 ring-inset ring-blue-300 bg-blue-50' : ''}`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                            checked={selectedUserIds.has(user.id)}
                            onChange={(e) => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(user.id);
                                } else {
                                  next.delete(user.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">{user.id}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{user.name}</td>
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3 text-sm">{user.businessName}</td>
                        <td className="px-4 py-3 text-sm">{user.industry}</td>
                        <td className="px-4 py-3 text-sm">{user.region}</td>
                        <td className="px-4 py-3 text-sm">{user.registeredAt}</td>
                        <td className="px-4 py-3 text-sm">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                              <Shield size={12} /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setCurrentView('admin-detail');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold mr-2"
                          >
                            詳細
                          </button>
                          <button
                            onClick={() => {
                              const newRole = user.role === 'admin' ? 'user' : 'admin';
                              const action = newRole === 'admin' ? '管理者に昇格' : '一般ユーザーに降格';
                              if (!confirm(`${user.name}（${user.email}）を${action}しますか？`)) return;
                              apiUpdateRole(user.id, newRole).then((res) => {
                                if (res.ok && res.success) {
                                  setAdminUsersList((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
                                } else {
                                  alert(res.error || '権限変更に失敗しました');
                                }
                              });
                            }}
                            disabled={currentUserProfile?.id === user.id}
                            className={`${user.role === 'admin' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} font-semibold mr-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {user.role === 'admin' ? '降格' : '昇格'}
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`${user.name}（${user.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
                              apiDeleteUser(user.id).then((res) => {
                                if (res.ok && res.success) {
                                  setAdminUsersList((prev) => prev.filter((u) => u.id !== user.id));
                                  setSelectedUserIds((prev) => { const next = new Set(prev); next.delete(user.id); return next; });
                                } else {
                                  alert(res.error || '削除に失敗しました');
                                }
                              });
                            }}
                            disabled={currentUserProfile?.id === user.id}
                            className="text-red-600 hover:text-red-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'admin-settings' && (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-yellow-600" size={32} />
                <h2 className="text-2xl font-bold">管理者設定</h2>
              </div>
              <button 
                onClick={() => setCurrentView('admin')}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← ダッシュボードに戻る
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm text-blue-800 font-semibold mb-1">管理者ログインについて</p>
                <p className="text-xs text-blue-700">
                  管理者はトップの「ログイン」から、role=admin のアカウントでメール・パスワードを入力してログインします。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'admin-detail' && selectedUser && (
        <div className="max-w-4xl mx-auto p-6">
          <button 
            onClick={() => setCurrentView('admin')}
            className="text-blue-600 hover:text-blue-800 font-semibold mb-4"
          >
            ← 管理画面に戻る
          </button>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {(selectedUser.profileImage ?? (selectedUser as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                  <img src={(selectedUser.profileImage ?? (selectedUser as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={selectedUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">{(selectedUser as UserProfile & { image?: string }).image ?? '👤'}</div>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-bold">{selectedUser.name}</h2>
                <p className="text-gray-600">ID: {selectedUser.id} | 登録日: {selectedUser.registeredAt}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-blue-600">基本情報</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>メール:</strong> {selectedUser.email}</p>
                  <p><strong>電話:</strong> {selectedUser.phone}</p>
                  <p><strong>Chatwork ID:</strong> {selectedUser.chatworkId || '未設定'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-green-600">SNSアカウント</h3>
                <div className="space-y-2 text-sm">
                  {selectedUser.sns1Type && (
                    <p><strong>{selectedUser.sns1Type}:</strong> {selectedUser.sns1Account}</p>
                  )}
                  {selectedUser.sns2Type && (
                    <p><strong>{selectedUser.sns2Type}:</strong> {selectedUser.sns2Account}</p>
                  )}
                  {selectedUser.sns3Type && (
                    <p><strong>{selectedUser.sns3Type}:</strong> {selectedUser.sns3Account}</p>
                  )}
                  {!selectedUser.sns1Type && !selectedUser.sns2Type && !selectedUser.sns3Type && (
                    <p className="text-gray-500">未設定</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-purple-600">ビジネス情報</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>ビジネス名:</strong> {selectedUser.businessName}</p>
                  <p><strong>業種:</strong> {selectedUser.industry}</p>
                  <p><strong>内容:</strong> {(selectedUser as UserProfile & { business?: string }).business ?? selectedUser.businessName ?? ''}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-orange-600">所在地</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>国:</strong> {selectedUser.country}</p>
                  <p><strong>都道府県:</strong> {selectedUser.region}</p>
                  <p><strong>市区町村:</strong> {selectedUser.city}</p>
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="text-lg font-bold mb-3 text-cyan-600">メンバーへのメッセージ</h3>
                <p className="text-sm bg-cyan-50 p-4 rounded-lg italic">
                  {selectedUser.message || 'メッセージ未設定'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-indigo-600">提供できる価値</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.skills.map((skill, idx) => (
                    <span key={idx} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-pink-600">興味・関心</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.interests.map((interest, idx) => (
                    <span key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {currentUserProfile?.id !== selectedUser.id && (
                <div className="col-span-2 mt-6 pt-6 border-t">
                  <button
                    onClick={() => {
                      if (!confirm(`${selectedUser.name}（${selectedUser.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
                      apiDeleteUser(selectedUser.id).then((res) => {
                        if (res.ok && res.success) {
                          setCurrentView('admin');
                          setSelectedUser(null);
                          apiUsers().then((r) => { if (r.ok && r.users) setAdminUsersList(r.users as UserProfile[]); });
                        } else {
                          alert(res.error || '削除に失敗しました');
                        }
                      });
                    }}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700"
                  >
                    このユーザーを退会者として削除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
};

export default BusinessMatchingApp;