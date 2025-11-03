import React from 'react';
import UpdateProfileForm from './components/UpdateProfileForm/UpdateProfileForm';

const UpdateProfile: React.FC = () => {
  return (
    <div className="unjam-h-full unjam-overflow-y-auto unjam-p-4">
      <div className="unjam-max-w-2xl unjam-mx-auto">
        <UpdateProfileForm />
      </div>
    </div>
  );
};

export default UpdateProfile;
