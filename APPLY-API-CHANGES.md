# App.tsx に API 連携を適用する手順

既存の `App.tsx` に以下を適用してください。  
（`src/apiClient.ts` は作成済み。`App.tsx` が `src` の外にある場合は import パスを `'./apiClient'` などに合わせてください。）

---

## 1. 先頭の import に追加

```tsx
import React, { useState, ChangeEvent, useEffect } from 'react';
```

既存の `lucide-react` の次に追加:

```tsx
import {
  getStoredToken,
  setStoredToken,
  apiRegister,
  apiLogin,
  apiMe,
  apiMembers,
  apiUsers,
  apiDeleteUser,
  type UserProfile as ApiUserProfile,
  type RegisterBody,
} from './src/apiClient';
```

（`UserProfile` が既に interface で定義されているので、API の型は `ApiUserProfile` として import。）

---

## 2. state の追加・削除

**削除する state:**
- `adminPassword`
- `adminPasswordInput`

**追加する state:**
```tsx
const [membersList, setMembersList] = useState<UserProfile[]>([]);
const [membersLoading, setMembersLoading] = useState(false);
const [apiError, setApiError] = useState<string>('');
```

（`dummyUsers` は後で参照を `membersList` に置き換えます。）

---

## 3. 初回ロード・認証チェック（dummyUsers の直前に追加）

```tsx
useEffect(() => {
  const token = getStoredToken();
  const publicViews = ['welcome', 'register', 'forgot-password', 'reset-link-sent', 'reset-password', 'password-reset-complete'];
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
```

---

## 4. dummyUsers の参照を membersList に置き換え

- `dummyUsers` という配列そのものは **削除** する（定義ごと消す）。
- 文中の `dummyUsers` をすべて `membersList` に置き換える。
- `downloadCSV` 内の `dummyUsers` も `membersList` に変更。

---

## 5. ウェルカム画面の「ログイン」ボタン

「ログイン」ボタンの `onClick` を、ダミーログインではなく「ログイン画面へ遷移」に変更:

```tsx
onClick={() => {
  setPasswordError('');
  setApiError('');
  setCurrentView('login');
}}
```

「管理者ログイン」ボタンは **削除**（管理者は通常ログインで role=admin のアカウントを使う）。

---

## 6. ログイン画面の新規追加（renderLoginView）

`renderWelcomeView` の直後（`renderRegistrationView` の前）に、以下を追加:

```tsx
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
```

---

## 7. ルート分岐に login を追加

`if (currentView === 'welcome') return renderWelcomeView();` の次に:

```tsx
if (currentView === 'login') return renderLoginView();
```

---

## 8. 新規登録「登録完了」ボタンの処理

登録完了ボタンの `onClick` 内を、API 登録＋ログインに差し替え:

```tsx
// 登録完了ボタン（registrationStep === 3 のとき）
onClick={async () => {
  const finalSkills = [...formData.skills];
  if (tempSkill.trim() && !finalSkills.includes(tempSkill.trim())) finalSkills.push(tempSkill.trim());
  const finalInterests = [...formData.interests];
  if (tempInterest.trim() && !finalInterests.includes(tempInterest.trim())) finalInterests.push(tempInterest.trim());
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
    alert(regRes.error || '登録に失敗しました');
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
```

（登録完了画面のあと「マッチングを始める」で home に飛ぶのはそのままでよい。）

---

## 9. ホーム・検索・管理画面のデータソース

- **ホーム**の「おすすめマッチ」: `dummyUsers` → `membersList.filter(u => u.id !== currentUserProfile?.id)` に変更。  
  ロード中は `membersLoading` で「読み込み中」表示を出してもよい。
- **検索**の `performSearch`: いったん `membersList` をフィルタする形でよい。  
  （必要なら後から `apiMembers(searchFilters)` でサーバ検索に変更可能。）
- **管理画面**: 一覧と CSV は **管理者のみ** にし、`apiUsers()` で取得したデータを使う。  
  - 管理画面に入るときに `apiUsers()` を呼び、state に `adminUsersList` などを保存して表示・CSV に使う。
  - 管理者でない人が `/admin` に直で行った場合は `apiUsers()` が 401 になるので、そのときは「権限がありません」表示にして welcome に戻す。

---

## 10. 管理者ログイン画面の削除

- `currentView === 'admin-login'` の分岐と `renderAdminLoginView` を削除。
- ウェルカムの「管理者ログイン」ボタンは削除済み。
- 管理者は通常の「ログイン」から、role=admin のアカウントでログインする。  
  ログイン後に `isAdmin` が true ならホームやヘッダーに「管理者」リンクを表示し、そこから管理画面へ。

---

## 11. ログアウト時にトークン削除

管理画面の「ログアウト」や、どこかで「ログアウト」を行うとき:

```tsx
setStoredToken(null);
setIsLoggedIn(false);
setIsAdmin(false);
setCurrentUserProfile(null);
setCurrentView('welcome');
```

---

## 12. API ベース URL について

`src/apiClient.ts` の `API_BASE` は、公開 URL が `ycscampaign.com/match` のときは `/match/api` になるようになっています。  
開発時は `index.html` を `/match/` で開くか、または `apiClient.ts` で `API_BASE = '/api'` にして、ローカルで PHP を `/api` にマッピングしてください。

---

## 13. 管理者：退会者を削除する機能

管理画面のユーザー一覧・詳細に「退会者を削除」ボタンを追加します。

### 13-1. 管理画面の一覧テーブルに「削除」列を追加

登録ユーザー一覧のテーブルで、各行の「操作」セルに「詳細」ボタンの横に「削除」ボタンを追加します。

```tsx
// 例: テーブル内の操作列
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
      if (!confirm(`${user.name}（${user.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
      apiDeleteUser(user.id).then((res) => {
        if (res.ok && res.success) {
          setAdminUsersList((prev) => prev.filter((u) => u.id !== user.id));
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
```

- 管理画面で「ユーザー一覧」を API から取得している state を `adminUsersList` とします（`apiUsers()` の結果を保存）。
- 削除成功時は `setAdminUsersList` で該当ユーザーを配列から除くか、再度 `apiUsers()` を呼んで一覧を再取得してください。
- `currentUserProfile?.id === user.id` のときは自分自身なのでボタンを `disabled` にします（自分自身は削除できません）。

### 13-2. 管理者詳細画面に「このユーザーを削除」ボタンを追加

`currentView === 'admin-detail'` のブロック内、詳細表示の下に削除ボタンを追加します。

```tsx
{currentView === 'admin-detail' && selectedUser && (
  // ... 既存の詳細表示 ...
  <div className="mt-6 pt-6 border-t">
    {currentUserProfile?.id !== selectedUser.id && (
      <button
        onClick={() => {
          if (!confirm(`${selectedUser.name}（${selectedUser.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
          apiDeleteUser(selectedUser.id).then((res) => {
            if (res.ok && res.success) {
              setCurrentView('admin');
              setSelectedUser(null);
              // 一覧を再取得
              apiUsers().then((r) => { if (r.ok && r.users) setAdminUsersList(r.users); });
            } else {
              alert(res.error || '削除に失敗しました');
            }
          });
        }}
        className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700"
      >
        このユーザーを退会者として削除
      </button>
    )}
  </div>
)}
```

- 自分自身の詳細のときはボタンを表示しない（`currentUserProfile?.id !== selectedUser.id`）。
- バックエンドでは「最後の1人いる管理者」は削除できません。その場合は `error: 'Cannot delete the last admin'` が返り、`alert` で表示されます。
